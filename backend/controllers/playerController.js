const Player = require('./../models/playerModel');
const catchAsync = require('./../utils/catchAsync');
const handlerFactory = require('./handlerFactory');
const APIFeatures = require('./../utils/apiFeatures');
// CREATE A NEW PLAYER (You already have this)
exports.createPlayer = handlerFactory.createOne(Player);

// GET ALL PLAYERS
// By default, exclude captains from the available players list.
// Pass includeCaptains=true to override and include captains as well.
exports.getAllPlayers = catchAsync(async (req, res, next) => {
  const includeCaptains =
    String(req.query.includeCaptains || 'false') === 'true';
  const baseFilter = includeCaptains ? {} : { isCaptain: { $ne: true } };

  const features = new APIFeatures(Player.find(baseFilter), req.query)
    .filter()
    .sorting()
    .limitFields()
    .pagination();

  features.query = features.query
    .populate({ path: 'team', select: 'name' })
    .populate({ path: 'bidHistory.team', select: 'name' });

  const docs = await features.query;

  res.status(200).json({
    status: 'success',
    results: docs.length,
    data: { players: docs },
  });
});

// GET A SINGLE PLAYER BY ID (populate team & bidHistory.team for names)
exports.getPlayer = catchAsync(async (req, res, next) => {
  const doc = await Player.findById(req.params.id)
    .populate({ path: 'team', select: 'name budget' })
    .populate({ path: 'bidHistory.team', select: 'name' });

  res.status(200).json({
    status: 'success',
    data: { doc },
  });
});
// UPDATE A PLAYER
exports.updatePlayer = handlerFactory.updateOne(Player);
// DELETE A PLAYER
exports.deletePlayer = handlerFactory.deleteOne(Player);
