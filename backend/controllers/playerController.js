const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { formatPlayer } = require('../utils/formatPlayer');

// CREATE A NEW PLAYER
exports.createPlayer = catchAsync(async (req, res, next) => {
  const { name, isCaptain, year, image, category, basePrice, status, teamId } = req.body;

  if (!name || !category) {
    return next(new AppError('Player name and category are required', 400));
  }

  const player = await prisma.player.create({
    data: {
      name: name.trim(),
      isCaptain: Boolean(isCaptain),
      year: year ? parseInt(year, 10) : null,
      image,
      category,
      basePrice: basePrice != null ? parseFloat(basePrice) : null,
      status: status || 'unsold',
      teamId: teamId || null,
    },
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  res.status(201).json({
    status: 'success',
    data: { data: formatPlayer(player) },
  });
});

// GET ALL PLAYERS
exports.getAllPlayers = catchAsync(async (req, res, next) => {
  const includeCaptains = String(req.query.includeCaptains || 'false') === 'true';

  const where = {};
  if (!includeCaptains) {
    where.isCaptain = false;
  }
  if (req.query.year) {
    where.year = parseInt(req.query.year, 10);
  }
  if (req.query.category) {
    where.category = req.query.category;
  }
  if (req.query.status) {
    where.status = req.query.status;
  }

  const players = await prisma.player.findMany({
    where,
    include: {
      team: true,
      bids: {
        include: { team: true },
        orderBy: { timestamp: 'asc' },
      },
    },
    orderBy: [{ year: 'asc' }, { name: 'asc' }],
  });

  const formatted = players.map(formatPlayer);

  res.status(200).json({
    status: 'success',
    results: formatted.length,
    data: { players: formatted },
  });
});

// GET A SINGLE PLAYER BY ID
exports.getPlayer = catchAsync(async (req, res, next) => {
  const player = await prisma.player.findUnique({
    where: { id: req.params.id },
    include: {
      team: true,
      bids: {
        include: { team: true },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!player) {
    return next(new AppError('No player found with that ID', 404));
  }

  const formatted = formatPlayer(player);

  res.status(200).json({
    status: 'success',
    data: {
      doc: formatted,
      player: formatted,
    },
  });
});

// UPDATE A PLAYER
exports.updatePlayer = catchAsync(async (req, res, next) => {
  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData._id;

  if (updateData.year != null) updateData.year = parseInt(updateData.year, 10);
  if (updateData.basePrice != null) updateData.basePrice = parseFloat(updateData.basePrice);
  if (updateData.finalBidPrice != null) updateData.finalBidPrice = parseFloat(updateData.finalBidPrice);

  const player = await prisma.player.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  res.status(200).json({
    status: 'success',
    data: { doc: formatPlayer(player) },
  });
});

// DELETE A PLAYER
exports.deletePlayer = catchAsync(async (req, res, next) => {
  await prisma.player.delete({
    where: { id: req.params.id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
