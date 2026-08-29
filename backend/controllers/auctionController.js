const mongoose = require('mongoose');
const Player = require('../models/playerModel');
const Team = require('../models/teamModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.startAuction = catchAsync(async (req, res, next) => {
  const { playerId } = req.body;
  if (!playerId) {
    return next(new AppError('playerId is required', 400));
  }
  const player = await Player.findById(playerId);
  if (!player) {
    return next(new AppError('Player not found', 404));
  }
  // Update status if not already in auction or sold
  if (player.status === 'sold') {
    return next(new AppError('Player already sold', 400));
  }
  // Ensure only one player is marked in_auction at a time
  await Player.updateMany(
    { status: 'in_auction' },
    { $set: { status: 'unsold' } }
  );
  player.status = 'in_auction';
  await player.save();

  // Re-fetch populated for consistent client payload (team & bidHistory team names)
  const populated = await Player.findById(player._id)
    .populate({ path: 'bidHistory.team', select: 'name' })
    .populate({ path: 'team', select: 'name' });

  // Emit socket event to all connected clients (emit lean plain object)
  if (req.io) {
    const plain = populated.toObject({ getters: true, virtuals: false });
    // Attach teamName to each bid item for frontend convenience
    if (Array.isArray(plain.bidHistory)) {
      plain.bidHistory = plain.bidHistory.map((b) => ({
        ...b,
        teamName: b.team?.name || b.teamName || 'Unknown Team',
      }));
    }
    if (plain.team && plain.team.name) plain.teamName = plain.team.name;
    console.log('[Auction] Emitting new_player', plain.name, plain._id);
    req.io.emit('new_player', plain);
  }

  res.status(200).json({
    status: 'success',
    data: { player },
  });
});

exports.getCurrentAuctionPlayer = catchAsync(async (req, res, next) => {
  const player = await Player.findOne({ status: 'in_auction' })
    .populate({ path: 'bidHistory.team', select: 'name' })
    .populate({ path: 'team', select: 'name' });
  let shaped = null;
  if (player) {
    shaped = player.toObject({ getters: true, virtuals: false });
    if (Array.isArray(shaped.bidHistory)) {
      shaped.bidHistory = shaped.bidHistory.map((b) => ({
        ...b,
        teamName: b.team?.name || b.teamName || 'Unknown Team',
      }));
    }
    if (shaped.team && shaped.team.name) shaped.teamName = shaped.team.name;
  }
  res.status(200).json({
    status: 'success',
    data: { player: shaped },
  });
});

// Sell the current in-auction player (prefers transaction; falls back if unavailable).
// Expected body: { playerId, teamId, finalBid } (backward compatible: finalBidPrice)
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

  let updatedPlayer;
  let updatedTeam;
  // Try transactional path first
  let usedFallback = false;
  try {
    // If not connected, skip transaction path quickly
    if (mongoose.connection.readyState !== 1) throw new Error('NO_DB');
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const player = await Player.findById(playerId).session(session);
        if (!player) throw new AppError('Player not found', 404);
        if (player.status === 'sold')
          throw new AppError('Player already sold', 400);
        if (player.status !== 'in_auction')
          throw new AppError('Player is not currently in auction', 400);

        const team = await Team.findById(teamId).session(session);
        if (!team) throw new AppError('Team not found', 404);
        if (team.budget != null && team.budget < finalBid)
          throw new AppError('Team does not have enough budget', 400);

        // Update player
        updatedPlayer = await Player.findByIdAndUpdate(
          playerId,
          {
            $set: {
              status: 'sold',
              team: team._id,
              finalBidPrice: finalBid,
            },
          },
          { new: true, session }
        );

        // Update team atomically
        updatedTeam = await Team.findByIdAndUpdate(
          teamId,
          {
            $addToSet: { players: playerId },
            ...(typeof finalBid === 'number'
              ? { $inc: { budget: -finalBid } }
              : {}),
          },
          { new: true, session }
        );

        if (updatedTeam && updatedTeam.budget < 0) {
          throw new AppError('Budget would become negative', 400);
        }
      });
    } finally {
      await session.endSession();
    }
  } catch (err) {
    // Fallback path without transactions (e.g., standalone DB or connection lag)
    usedFallback = true;
    // Validate preconditions first (non-transactional)
    const player = await Player.findById(playerId);
    if (!player) return next(new AppError('Player not found', 404));
    if (player.status === 'sold')
      return next(new AppError('Player already sold', 400));
    if (player.status !== 'in_auction')
      return next(new AppError('Player is not currently in auction', 400));

    // Atomically decrement budget only if sufficient, and add player
    updatedTeam = await Team.findOneAndUpdate(
      {
        _id: teamId,
        ...(typeof finalBid === 'number' ? { budget: { $gte: finalBid } } : {}),
      },
      {
        $addToSet: { players: playerId },
        ...(typeof finalBid === 'number'
          ? { $inc: { budget: -finalBid } }
          : {}),
      },
      { new: true }
    );
    if (!updatedTeam) {
      return next(new AppError('Team not found or insufficient budget', 400));
    }

    // Now atomically flip player to sold only if still in_auction
    updatedPlayer = await Player.findOneAndUpdate(
      { _id: playerId, status: 'in_auction' },
      {
        $set: {
          status: 'sold',
          team: updatedTeam._id,
          finalBidPrice: finalBid,
        },
      },
      { new: true }
    );

    // Compensation if player update failed (e.g., race): revert team changes
    if (!updatedPlayer) {
      await Team.findByIdAndUpdate(updatedTeam._id, {
        $pull: { players: playerId },
        ...(typeof finalBid === 'number' ? { $inc: { budget: finalBid } } : {}),
      });
      return next(new AppError('Player state changed, try again', 409));
    }
  }

  // Populate player for broadcast
  const populatedPlayer = await Player.findById(updatedPlayer._id)
    .populate({ path: 'bidHistory.team', select: 'name' })
    .populate({ path: 'team', select: 'name budget' });
  const playerPlain = populatedPlayer.toObject({
    getters: true,
    virtuals: false,
  });
  if (Array.isArray(playerPlain.bidHistory)) {
    playerPlain.bidHistory = playerPlain.bidHistory.map((b) => ({
      ...b,
      teamName: b.team?.name || b.teamName || 'Unknown Team',
    }));
  }
  if (playerPlain.team && playerPlain.team.name) {
    playerPlain.teamName = playerPlain.team.name;
  }

  if (req.io) {
    console.log(
      '[Auction] Emitting server:player_sold',
      playerPlain.name,
      playerPlain._id
    );
    req.io.emit('server:player_sold', {
      player: playerPlain,
      team: {
        id: updatedTeam._id,
        name: updatedTeam.name,
        budget: updatedTeam.budget,
        players: updatedTeam.players,
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      player: playerPlain,
      team: updatedTeam,
      mode: usedFallback ? 'fallback' : 'transaction',
    },
  });
});

// Mark the current in-auction player as unsold (did not receive any bids)
exports.markPlayerUnsold = catchAsync(async (req, res, next) => {
  const { playerId } = req.body;
  if (!playerId) return next(new AppError('playerId is required', 400));

  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));
  if (player.status !== 'in_auction') {
    return next(new AppError('Player is not currently in auction', 400));
  }
  // Do not allow marking unsold if any bids exist
  if (Array.isArray(player.bidHistory) && player.bidHistory.length > 0) {
    return next(new AppError('Cannot mark unsold: bids already placed', 400));
  }

  player.status = 'unsold';
  await player.save();

  if (req.io) {
    const populated = await Player.findById(player._id)
      .populate({ path: 'bidHistory.team', select: 'name' })
      .populate({ path: 'team', select: 'name' });
    const plain = populated.toObject({ getters: true, virtuals: false });
    if (Array.isArray(plain.bidHistory)) {
      plain.bidHistory = plain.bidHistory.map((b) => ({
        ...b,
        teamName: b.team?.name || b.teamName || 'Unknown Team',
      }));
    }
    if (plain.team && plain.team.name) plain.teamName = plain.team.name;
    console.log('[Auction] Emitting player_unsold', plain.name, plain._id);
    req.io.emit('player_unsold', plain);
  }

  res.status(200).json({
    status: 'success',
    data: { player },
  });
});
