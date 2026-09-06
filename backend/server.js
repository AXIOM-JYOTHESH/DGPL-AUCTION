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

// --- Authoritative Auction Timer & Gavel State ---
const timerState = {
  mode: 'timer', // 'timer' | 'manual'
  duration: 30, // seconds
  timeLeft: 30,
  isRunning: false,
  startedAt: null,
  expiresAt: null,
  callState: null, // null | 'once' | 'twice' | 'final'
  autoResetOnBid: true,
};

let timerInterval = null;

function broadcastTimerUpdate() {
  io.emit('auction:timer_update', { ...timerState });
}

function stopTimerTicker() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimerTicker() {
  stopTimerTicker();
  timerInterval = setInterval(() => {
    if (!timerState.isRunning || !timerState.expiresAt) {
      stopTimerTicker();
      return;
    }
    const remaining = Math.max(0, Math.round((timerState.expiresAt - Date.now()) / 1000));
    timerState.timeLeft = remaining;
    if (remaining <= 0) {
      timerState.isRunning = false;
      timerState.timeLeft = 0;
      stopTimerTicker();
      io.emit('auction:timer_expired', { ...timerState });
      broadcastTimerUpdate();

      // Trigger automatic sale to highest bidder upon timer expiration
      handleAutoSellOnTimerExpire();
    } else {
      broadcastTimerUpdate();
    }
  }, 1000);
}

// Auto-sell or mark unsold when timer reaches zero
async function handleAutoSellOnTimerExpire() {
  try {
    console.log('[Timer] Expiry reached. Checking active player for auto-sell...');
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
      console.log('[Timer] No active in_auction player found on timer expiry');
      return;
    }

    const bids = livePlayer.bids || [];
    if (bids.length > 0) {
      const winningBid = bids[bids.length - 1];
      const winningTeamId = winningBid.teamId;
      const finalBidAmount = winningBid.bidAmount;

      console.log(
        '[Timer] Auto-selling player %s to team %s for %s Pts',
        livePlayer.name,
        winningBid.team?.name || winningTeamId,
        finalBidAmount
      );

      const result = await prisma.$transaction(async (tx) => {
        const team = await tx.team.findUnique({
          where: { id: winningTeamId },
          include: { players: true },
        });

        if (!team) throw new Error('Winning team not found');

        const updatedPlayer = await tx.player.update({
          where: { id: livePlayer.id },
          data: {
            status: 'sold',
            teamId: team.id,
            finalBidPrice: finalBidAmount,
          },
          include: {
            team: true,
            bids: {
              include: { team: true },
              orderBy: { timestamp: 'asc' },
            },
          },
        });

        const newBudget = Math.max(0, (team.budget || 0) - finalBidAmount);
        const updatedTeam = await tx.team.update({
          where: { id: team.id },
          data: { budget: newBudget },
          include: { captain: true, players: true },
        });

        return { player: updatedPlayer, team: updatedTeam };
      });

      const playerPlain = formatPlayer(result.player);
      resetTimerState();

      io.emit('server:player_sold', {
        player: playerPlain,
        team: {
          id: result.team.id,
          _id: result.team.id,
          name: result.team.name,
          budget: result.team.budget,
          players: result.team.players.map((p) => p.id),
        },
      });
      console.log('[Timer] Successfully emitted auto-sell for:', playerPlain.name);
    } else {
      console.log('[Timer] Zero bids on timer expiry. Marking player unsold:', livePlayer.name);
      const updatedPlayer = await prisma.player.update({
        where: { id: livePlayer.id },
        data: { status: 'unsold' },
        include: {
          team: true,
          bids: {
            include: { team: true },
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      const playerPlain = formatPlayer(updatedPlayer);
      resetTimerState();
      io.emit('player_unsold', playerPlain);
    }
  } catch (err) {
    console.error('[Timer] Error executing auto-sell on expiry:', err);
  }
}

function resetTimerState(newDuration) {
  stopTimerTicker();
  if (typeof newDuration === 'number' && newDuration > 0) {
    timerState.duration = newDuration;
  }
  timerState.timeLeft = timerState.duration;
  timerState.isRunning = false;
  timerState.startedAt = null;
  timerState.expiresAt = null;
  timerState.callState = null;
  broadcastTimerUpdate();
}

app.set('resetAuctionTimer', resetTimerState);

// --- Tournament Privacy & Auction Completed Settings ---
let appSettings = {
  privacyMode: false,
  auctionCompleted: false,
};

(async () => {
  try {
    const cfg = await prisma.appConfig.findFirst();
    if (cfg) {
      appSettings.privacyMode = Boolean(cfg.privacyMode);
      appSettings.auctionCompleted = Boolean(cfg.auctionCompleted);
      console.log('[Config] Loaded tournament settings from DB:', appSettings);
    }
  } catch (e) {
    console.error('[Config] Failed to load appSettings from DB:', e.message);
  }
})();

function broadcastConfigUpdate() {
  io.emit('auction:config_update', { ...appSettings });
}

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

  // Send authoritative auction timer state to connected client
  socket.emit('auction:timer_update', { ...timerState });
  // Send authoritative tournament config (privacy mode & auction completed)
  socket.emit('auction:config_update', { ...appSettings });

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

  // Captain places a bid (supports optional custom increment, e.g. 0.25, 0.5, 1, 1.5, 2)
  socket.on('captain:place_bid', async (incoming = {}) => {
    try {
      console.log(
        '[Bid] Event captain:place_bid received socket=%s user=%s role=%s team=%s incoming=%o',
        socket.id,
        socket.user?.name,
        socket.user?.role,
        socket.user?.team,
        incoming
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

      const customIncrement =
        incoming && typeof incoming.increment === 'number' && incoming.increment > 0
          ? Number(incoming.increment)
          : null;

      let desiredBidAmount;
      if (hasHistory) {
        if (customIncrement) {
          desiredBidAmount = Number((currentHighestBid + customIncrement).toFixed(2));
        } else {
          desiredBidAmount = computeNextBid(currentHighestBid);
        }
        if (desiredBidAmount == null) return;
      } else {
        const base = Number(livePlayer.basePrice) || 0;
        if (customIncrement && customIncrement > 0.25) {
          desiredBidAmount = Number((base + (customIncrement - 0.25)).toFixed(2));
        } else {
          desiredBidAmount = base;
        }
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

      // Reset manual gavel calls when a new bid is placed
      timerState.callState = null;

      // In timer mode with autoReset enabled, restart countdown clock
      if (timerState.mode === 'timer' && timerState.autoResetOnBid) {
        timerState.timeLeft = timerState.duration;
        if (timerState.isRunning) {
          timerState.startedAt = Date.now();
          timerState.expiresAt = Date.now() + timerState.duration * 1000;
          startTimerTicker();
        }
      }
      broadcastTimerUpdate();
    } catch (err) {
      console.error('[Bid] Unexpected error:', err);
      socket.emit('server:bid_error', { message: 'Bid failed' });
    }
  });

  // Admin Auction Clock & Gavel Control Event
  socket.on('admin:timer_action', async (payload = {}) => {
    try {
      console.log(
        '[Timer] Event admin:timer_action received from user=%s role=%s action=%s',
        socket.user?.name,
        socket.user?.role,
        payload?.action
      );

      // Strictly verify admin role
      if (!socket.user || socket.user.role !== 'admin') {
        socket.emit('server:timer_error', { message: 'Not authorized (admin only)' });
        console.warn('[Timer] Rejected admin:timer_action: user is not admin');
        return;
      }

      const { action } = payload;
      switch (action) {
        case 'start': {
          if (timerState.timeLeft <= 0) {
            timerState.timeLeft = timerState.duration;
          }
          timerState.isRunning = true;
          timerState.startedAt = Date.now();
          timerState.expiresAt = Date.now() + timerState.timeLeft * 1000;
          timerState.callState = null;
          startTimerTicker();
          broadcastTimerUpdate();
          break;
        }
        case 'pause': {
          if (timerState.isRunning && timerState.expiresAt) {
            timerState.timeLeft = Math.max(0, Math.round((timerState.expiresAt - Date.now()) / 1000));
          }
          timerState.isRunning = false;
          timerState.expiresAt = null;
          stopTimerTicker();
          broadcastTimerUpdate();
          break;
        }
        case 'reset': {
          resetTimerState();
          break;
        }
        case 'set_duration': {
          const dur = Math.max(5, parseInt(payload.duration, 10) || 30);
          timerState.duration = dur;
          if (!timerState.isRunning) {
            timerState.timeLeft = dur;
            timerState.expiresAt = null;
          }
          broadcastTimerUpdate();
          break;
        }
        case 'set_mode': {
          timerState.mode = payload.mode === 'manual' ? 'manual' : 'timer';
          if (timerState.mode === 'manual') {
            timerState.isRunning = false;
            stopTimerTicker();
          }
          broadcastTimerUpdate();
          break;
        }
        case 'set_call': {
          const allowed = ['once', 'twice', 'final', null];
          if (allowed.includes(payload.callState)) {
            timerState.callState = payload.callState;
            broadcastTimerUpdate();
          }
          break;
        }
        case 'advance_call': {
          if (!timerState.callState) {
            timerState.callState = 'once';
          } else if (timerState.callState === 'once') {
            timerState.callState = 'twice';
          } else if (timerState.callState === 'twice') {
            timerState.callState = 'final';
          } else {
            timerState.callState = null;
          }
          broadcastTimerUpdate();
          break;
        }
        case 'add_time': {
          const addSec = parseInt(payload.seconds, 10) || 15;
          timerState.timeLeft = Math.max(0, timerState.timeLeft + addSec);
          if (timerState.isRunning && timerState.expiresAt) {
            timerState.expiresAt += addSec * 1000;
          }
          broadcastTimerUpdate();
          break;
        }
        case 'set_auto_reset': {
          timerState.autoResetOnBid = Boolean(payload.autoResetOnBid);
          broadcastTimerUpdate();
          break;
        }
        case 'set_privacy': {
          const isPrivate = Boolean(payload.privacyMode);
          appSettings.privacyMode = isPrivate;
          try {
            const cfg = await prisma.appConfig.findFirst();
            if (cfg) {
              await prisma.appConfig.update({
                where: { id: cfg.id },
                data: { privacyMode: isPrivate },
              });
            }
          } catch (e) {
            console.error('[Config] Failed to save privacyMode to DB:', e.message);
          }
          console.log('[Admin] Privacy mode updated to:', isPrivate);
          broadcastConfigUpdate();
          break;
        }
        case 'set_auction_completed': {
          const isCompleted = Boolean(payload.auctionCompleted);
          appSettings.auctionCompleted = isCompleted;
          try {
            const cfg = await prisma.appConfig.findFirst();
            if (cfg) {
              await prisma.appConfig.update({
                where: { id: cfg.id },
                data: { auctionCompleted: isCompleted },
              });
            }
          } catch (e) {
            console.error('[Config] Failed to save auctionCompleted to DB:', e.message);
          }
          console.log('[Admin] Auction completed updated to:', isCompleted);
          broadcastConfigUpdate();
          break;
        }
        default:
          console.warn('[Timer] Unknown action:', action);
          break;
      }
    } catch (err) {
      console.error('[Timer] Unexpected error handling admin action:', err);
    }
  });

  // Admin Random Player Launch Event
  socket.on('admin:start_random_player', async () => {
    try {
      console.log(
        '[Admin] Event admin:start_random_player received from user=%s role=%s',
        socket.user?.name,
        socket.user?.role
      );

      if (!socket.user || socket.user.role !== 'admin') {
        socket.emit('server:error', { message: 'Not authorized (admin only)' });
        return;
      }

      // Find available or unsold players
      let candidates = await prisma.player.findMany({
        where: { status: 'available' },
        include: { team: true, bids: { include: { team: true } } },
      });
      if (candidates.length === 0) {
        candidates = await prisma.player.findMany({
          where: { status: 'unsold' },
          include: { team: true, bids: { include: { team: true } } },
        });
      }

      if (candidates.length === 0) {
        socket.emit('server:error', {
          message: 'No available or unsold players left to draw!',
        });
        return;
      }

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];

      // Move previous in_auction player to unsold or available
      await prisma.player.updateMany({
        where: { status: 'in_auction', id: { not: chosen.id } },
        data: { status: 'available' },
      });

      // Set chosen player to in_auction
      const updated = await prisma.player.update({
        where: { id: chosen.id },
        data: { status: 'in_auction', finalBidPrice: null, teamId: null },
        include: {
          team: true,
          bids: {
            include: { team: true },
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      resetTimerState();

      const formatted = formatPlayer(updated);
      io.emit('new_player', formatted);
      io.emit('server:random_draw', { player: formatted });
      console.log('[Admin] Random player successfully drawn onto stage:', formatted.name);
    } catch (err) {
      console.error('[Admin] Error drawing random player:', err);
      socket.emit('server:error', { message: 'Failed to draw random player' });
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
