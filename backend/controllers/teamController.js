const Team = require('./../models/teamModel');
const catchAsync = require('./../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

// CREATE A NEW Team
exports.createTeam = handlerFactory.createOne(Team);

// GET ALL Teams
exports.getAllTeams = handlerFactory.getAll(Team, [
  { path: 'captain', select: 'name image isCaptain category' },
  { path: 'players', select: 'name image category isCaptain' },
]);

// GET A SINGLE Team BY ID
exports.getTeam = handlerFactory.getOne(Team, [
  { path: 'captain', select: 'name image isCaptain category' },
  { path: 'players', select: 'name image category isCaptain' },
]);

// UPDATE A Team
exports.updateTeam = handlerFactory.updateOne(Team);

// DELETE A Team
exports.deleteTeam = handlerFactory.deleteOne(Team);

// aDD player to a team ..
exports.addPlayerToTeam = catchAsync(async (req, res, next) => {
  // first we find the playerId to team ...

  const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!team) {
    return next(new appError(' please check your team Id', 400));
  }
  res.status(200).json({
    status: 'Success',
    body: team,
  });
});
