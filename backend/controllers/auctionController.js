const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { formatPlayer, formatTeam } = require('../utils/formatPlayer');

// Start auction for a single player
exports.startAuction = catchAsync(async (req, res, next) => {
  const { playerId } = req.body;
  if (!playerId) {
    return next(new AppError('playerId is required', 400));
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    return next(new AppError('Player not found', 404));
  }

  if (player.status === 'sold') {
    return next(new AppError('Player already sold', 400));
  }
  if (player.status === 'pending') {
    return next(new AppError('Player registration is pending admin approval', 400));
  }
  if (player.status === 'rejected') {
    return next(new AppError('Player registration has been rejected', 400));
  }

  // Ensure only one player is marked in_auction at a time
  await prisma.player.updateMany({
    where: { status: 'in_auction' },
    data: { status: 'unsold' },
  });

  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: { status: 'in_auction' },
    include: {
      team: true,
      bids: {
        include: { team: true },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  const plain = formatPlayer(updatedPlayer);

  // Reset auction clock / gavel state for new player
  req.app.get('resetAuctionTimer')?.();

  // Emit socket event to all connected clients
  if (req.io) {
    console.log('[Auction] Emitting new_player', plain.name, plain.id);
    req.io.emit('new_player', plain);
  }

  res.status(200).json({
    status: 'success',
    data: { player: plain },
  });
});

// Get the currently in-auction player
exports.getCurrentAuctionPlayer = catchAsync(async (req, res, next) => {
  const player = await prisma.player.findFirst({
    where: { status: 'in_auction' },
    include: {
      team: true,
      bids: {
        include: { team: true },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  const formatted = formatPlayer(player);

  res.status(200).json({
    status: 'success',
    data: { player: formatted },
  });
});

// Sell the current in-auction player (Atomic ACID Transaction)
exports.sellPlayer = catchAsync(async (req, res, next) => {
  const { playerId, teamId } = req.body;
  const finalBid =
    req.body.finalBid != null ? req.body.finalBid : req.body.finalBidPrice;

  if (!playerId || !teamId || finalBid == null) {
    return next(
      new AppError(
        'playerId, teamId and finalBid (or finalBidPrice) are required',
        400
      )
    );
  }

  const finalBidAmount = parseFloat(finalBid);

  // Strict ACID transaction in PostgreSQL
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({
      where: { id: playerId },
      include: { bids: { include: { team: true } } },
    });

    if (!player) throw new AppError('Player not found', 404);
    if (player.status === 'sold') throw new AppError('Player already sold', 400);
    if (player.status !== 'in_auction')
      throw new AppError('Player is not currently in auction', 400);

    const team = await tx.team.findUnique({
      where: { id: teamId },
      include: { players: true },
    });

    if (!team) throw new AppError('Team not found', 404);
    if (team.budget != null && team.budget < finalBidAmount) {
      throw new AppError('Team does not have enough budget', 400);
    }

    // 1. Update player status, assigned team, and final price
    const updatedPlayer = await tx.player.update({
      where: { id: playerId },
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

    // 2. Atomically deduct team purse budget
    const updatedTeam = await tx.team.update({
      where: { id: teamId },
      data: {
        budget: team.budget - finalBidAmount,
      },
      include: {
        captain: true,
        players: true,
      },
    });

    if (updatedTeam.budget < 0) {
      throw new AppError('Budget would become negative', 400);
    }

    return { player: updatedPlayer, team: updatedTeam };
  });

  const playerPlain = formatPlayer(result.player);
  const teamPlain = formatTeam(result.team);

  // Reset auction timer state
  req.app.get('resetAuctionTimer')?.();

  if (req.io) {
    console.log(
      '[Auction] Emitting server:player_sold',
      playerPlain.name,
      playerPlain.id
    );
    req.io.emit('server:player_sold', {
      player: playerPlain,
      team: {
        id: result.team.id,
        _id: result.team.id,
        name: result.team.name,
        budget: result.team.budget,
        players: result.team.players.map((p) => p.id),
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      player: playerPlain,
      team: teamPlain,
      mode: 'postgres-acid-transaction',
    },
  });
});

// Mark the current in-auction player as unsold
exports.markPlayerUnsold = catchAsync(async (req, res, next) => {
  const { playerId } = req.body;
  if (!playerId) return next(new AppError('playerId is required', 400));

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { bids: true },
  });

  if (!player) return next(new AppError('Player not found', 404));
  if (player.status !== 'in_auction') {
    return next(new AppError('Player is not currently in auction', 400));
  }

  if (Array.isArray(player.bids) && player.bids.length > 0) {
    return next(new AppError('Cannot mark unsold: bids already placed', 400));
  }

  const updatedPlayer = await prisma.player.update({
    where: { id: playerId },
    data: { status: 'unsold' },
    include: {
      team: true,
      bids: {
        include: { team: true },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  const plain = formatPlayer(updatedPlayer);

  // Reset auction timer state
  req.app.get('resetAuctionTimer')?.();

  if (req.io) {
    console.log('[Auction] Emitting player_unsold', plain.name, plain.id);
    req.io.emit('player_unsold', plain);
  }

  res.status(200).json({
    status: 'success',
    data: { player: plain },
  });
});

// Get tournament config (privacy mode & auction completed status)
exports.getAuctionConfig = catchAsync(async (req, res, next) => {
  const cfg = await prisma.appConfig.findFirst();
  res.status(200).json({
    status: 'success',
    data: {
      privacyMode: Boolean(cfg?.privacyMode),
      auctionCompleted: Boolean(cfg?.auctionCompleted),
    },
  });
});

// Admin triggers random player draw
exports.startRandomPlayer = catchAsync(async (req, res, next) => {
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
    return next(new AppError('No available or unsold players left to draw', 400));
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  await prisma.player.updateMany({
    where: { status: 'in_auction', id: { not: chosen.id } },
    data: { status: 'available' },
  });

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

  req.app.get('resetAuctionTimer')?.();

  const plain = formatPlayer(updated);
  if (req.io) {
    console.log('[Auction] Emitting new_player from random draw:', plain.name);
    req.io.emit('new_player', plain);
    req.io.emit('server:random_draw', { player: plain });
  }

  res.status(200).json({
    status: 'success',
    data: { player: plain },
  });
});
