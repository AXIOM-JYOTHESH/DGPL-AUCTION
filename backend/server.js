const path = require('path');
const dotenv = require('dotenv');
// Load env regardless of where node is invoked from
dotenv.config({ path: path.join(__dirname, 'config.env') });
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const prisma = require('./prismaClient');
const { formatPlayer } = require('./utils/formatPlayer');

const PORT = process.env.PORT || 7777;
console.log('[Config] Using PORT =', PORT);

async function initDatabase() {
  try {
    console.log('[Database] Connecting to PostgreSQL via Prisma...');
    await prisma.$connect();
    console.log('[Database] PostgreSQL Connection Successful!');

    // Check if database needs initial seeding
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('[Database] Database is empty. Auto-seeding initial teams, players, and users...');
      const { importData } = require('./seed');
      await importData();
      console.log('[Database] Auto-seeding completed successfully!');
    }
  } catch (err) {
    console.error('[Database] Connection/Initialization Error:', err.message || err);
  }
}

initDatabase();

// Create HTTP server from express app
const httpServer = http.createServer(app);

// Initialize Socket.IO with flexible CORS (allow LAN/mobile dev origins)
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins during development
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in express routes via req.app.get('io')
app.set('io', io);

// Permissive auth middleware: verify JWT if provided, else allow guest
io.use(async (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Check global invalidation timestamp
      const cfg = await prisma.appConfig.findFirst();
      if (cfg && cfg.sessionsInvalidatedAt) {
        const issuedAtMs = (decoded.iat || 0) * 1000;
        if (issuedAtMs < new Date(cfg.sessionsInvalidatedAt).getTime()) {
          return next(); // treat as guest
        }
      }
      if (decoded?.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            teamId: true,
            playerProfileId: true,
          },
        });
        if (user) {
          socket.user = {
            _id: user.id,
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            team: user.teamId,
            playerProfile: user.playerProfileId,
          };
        }
      }
    }
  } catch (err) {
    // Silently ignore errors to allow guest connection
  } finally {
    next();
  }
});

io.on('connection', (socket) => {
  console.log(
    '[Socket] Client connected id=%s authUser=%s role=%s team=%s',
    socket.id,
    socket.user?.name,
    socket.user?.role,
    socket.user?.team
  );

  // On connect, send currently in_auction player (if any) for late joiners / refresh
  (async () => {
    try {
      const live = await prisma.player.findFirst({
        where: { status: 'in_auction' },
        include: {
          team: true,
          bids: {
            include: { team: true },
            orderBy: { timestamp: 'asc' },
          },
        },
      });
      if (live) {
        socket.emit('new_player', formatPlayer(live));
      }
    } catch (e) {
      // ignore sync errors
    }
  })();

  // Helper to compute next bid using tiered increments
  // Rules: current < 5 => +0.25, 5 <= current < 10 => +0.5, current >= 10 => +1
  const computeNextBid = (current) => {
    if (current == null) {
      console.log('[Bid] computeNextBid aborted: current is null/undefined');
      return null;
    }
    const n = Number(current);
    if (Number.isNaN(n)) {
      console.log('[Bid] computeNextBid aborted: current not a number value=%o', current);
      return null;
    }
    let inc;
    if (n < 5) inc = 0.25;
    else if (n < 10) inc = 0.5;
    else inc = 1;
    const next = Number((n + inc).toFixed(2));
    console.log('[Bid] computeNextBid current=%s inc=%s next=%s', n, inc, next);
    return next;
  };

  // Captain places a bid
  socket.on('captain:place_bid', async () => {
    try {
      console.log(
        '[Bid] Event captain:place_bid received socket=%s user=%s role=%s team=%s',
        socket.id,
        socket.user?.name,
        socket.user?.role,
        socket.user?.team
      );

      // Auth & role check (only captain role supported)
      if (!socket.user || socket.user.role !== 'captain') {
        socket.emit('server:bid_error', { message: 'Not authorized (captain only)' });
        console.log('[Bid] Rejected: not authorized');
        return;
      }
      if (!socket.user.team) {
        socket.emit('server:bid_error', { message: 'No team assigned to user' });
        console.log('[Bid] Rejected: user has no team');
        return;
      }

      // Find current player in auction
      const livePlayer = await prisma.player.findFirst({
        where: { status: 'in_auction' },
        include: {
          team: true,
          bids: {
            include: { team: true },
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      if (!livePlayer) {
        socket.emit('server:bid_error', { message: 'No active player' });
        console.log('[Bid] Rejected: no active player in_auction');
        return;
      }

      const bids = livePlayer.bids || [];
      const hasHistory = bids.length > 0;
      let currentHighestBid;

      if (hasHistory) {
        const lastBid = bids[bids.length - 1];
        currentHighestBid = lastBid.bidAmount;
        console.log('[Bid] Current highest from history=%s', currentHighestBid);

        // Block if last bid already from this team
        if (lastBid.teamId === socket.user.team.toString()) {
          socket.emit('server:bid_error', {
            message: 'You already hold the highest bid',
          });
          console.log('[Bid] Rejected: same team consecutive bid team=%s', lastBid.teamId);
          return;
        }
      } else {
        currentHighestBid = Number(livePlayer.basePrice) || 0;
        console.log('[Bid] No history; using basePrice as current=%s', currentHighestBid);
      }

      let desiredBidAmount;
      if (hasHistory) {
        desiredBidAmount = computeNextBid(currentHighestBid);
        if (desiredBidAmount == null) return;
      } else {
        desiredBidAmount = Number(livePlayer.basePrice) || 0;
      }

      // Load team & check budget
      const team = await prisma.team.findUnique({
        where: { id: socket.user.team.toString() },
      });

      if (!team) {
        socket.emit('server:bid_error', { message: 'Team not found' });
        return;
      }

      if (team.budget == null || team.budget < desiredBidAmount) {
        socket.emit('server:bid_error', { message: 'Insufficient funds' });
        return;
      }

      // Atomic Transaction in PostgreSQL: Record bid + update player
      const result = await prisma.$transaction(async (tx) => {
        const createdBid = await tx.bid.create({
          data: {
            playerId: livePlayer.id,
            teamId: team.id,
            bidAmount: desiredBidAmount,
          },
          include: { team: true },
        });

        const updatedPlayer = await tx.player.update({
          where: { id: livePlayer.id },
          data: {
            finalBidPrice: desiredBidAmount,
            teamId: team.id,
          },
          include: {
            team: true,
            bids: {
              include: { team: true },
              orderBy: { timestamp: 'asc' },
            },
          },
        });

        return { updatedPlayer, createdBid };
      });

      const formattedPlayer = formatPlayer(result.updatedPlayer);

      const payload = {
        playerId: livePlayer.id,
        finalBidPrice: desiredBidAmount,
        leadingTeam: { id: team.id, name: team.name },
        latestBid: {
          teamId: team.id,
          teamName: team.name,
          bidAmount: desiredBidAmount,
          timestamp: result.createdBid.timestamp,
        },
        player: formattedPlayer,
        bidHistoryLength: formattedPlayer.bidHistory.length,
      };

      io.emit('server:new_bid', payload);
      console.log(
        '[Bid] Broadcast server:new_bid amount=%s playerId=%s team=%s',
        desiredBidAmount,
        livePlayer.id,
        team.name
      );
    } catch (err) {
      console.error('[Bid] Unexpected error:', err);
      socket.emit('server:bid_error', { message: 'Bid failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Listen on 0.0.0.0 so that LAN/mobile devices can reach the server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`DGPL Auction server listening on ${PORT} (0.0.0.0)`);
});

module.exports = { app, io, httpServer };
