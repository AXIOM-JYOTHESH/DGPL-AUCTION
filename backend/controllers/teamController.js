const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { formatTeam } = require('../utils/formatPlayer');

// CREATE A NEW Team
exports.createTeam = catchAsync(async (req, res, next) => {
  const { name, image, budget, captainId } = req.body;

  if (!name) {
    return next(new AppError('Team name is required', 400));
  }

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      image,
      budget: budget != null ? parseFloat(budget) : 100.0,
      captainId: captainId || null,
    },
    include: {
      captain: true,
      players: true,
    },
  });

  res.status(201).json({
    status: 'success',
    data: { data: formatTeam(team) },
  });
});

// GET ALL Teams
exports.getAllTeams = catchAsync(async (req, res, next) => {
  const teams = await prisma.team.findMany({
    include: {
      captain: true,
      players: true,
    },
    orderBy: { name: 'asc' },
  });

  const formatted = teams.map(formatTeam);

  res.status(200).json({
    status: 'success',
    results: formatted.length,
    data: { teams: formatted },
  });
});

// GET A SINGLE Team BY ID
exports.getTeam = catchAsync(async (req, res, next) => {
  const team = await prisma.team.findUnique({
    where: { id: req.params.id },
    include: {
      captain: true,
      players: true,
    },
  });

  if (!team) {
    return next(new AppError('No team found with that ID', 404));
  }

  const formatted = formatTeam(team);

  res.status(200).json({
    status: 'success',
    data: {
      doc: formatted,
      team: formatted,
    },
  });
});

// UPDATE A Team
exports.updateTeam = catchAsync(async (req, res, next) => {
  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData._id;

  if (updateData.budget != null) updateData.budget = parseFloat(updateData.budget);

  const team = await prisma.team.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      captain: true,
      players: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: { doc: formatTeam(team) },
  });
});

// DELETE A Team
exports.deleteTeam = catchAsync(async (req, res, next) => {
  await prisma.team.delete({
    where: { id: req.params.id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// ADD player to a team
exports.addPlayerToTeam = catchAsync(async (req, res, next) => {
  const { playerId } = req.body;
  if (!playerId) {
    return next(new AppError('playerId is required', 400));
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: { teamId: req.params.id },
  });

  const updatedTeam = await prisma.team.findUnique({
    where: { id: req.params.id },
    include: {
      captain: true,
      players: true,
    },
  });

  res.status(200).json({
    status: 'Success',
    body: formatTeam(updatedTeam),
  });
});

// EXPORT ALL TEAMS ROSTERS AS CSV
// Exact format: Team Name, Captain Name, Player Name, Sold Points
exports.exportSquadsCSV = catchAsync(async (req, res, next) => {
  const teams = await prisma.team.findMany({
    include: {
      captain: true,
      user: true,
      players: {
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rows = [['Team Name', 'Captain Name', 'Player Name', 'Sold Points']];

  teams.forEach((t) => {
    const teamName = t.name || 'Unknown Team';
    let captainName = 'Not Assigned';

    if (t.captain && t.captain.name) {
      captainName = t.captain.name;
    } else if (Array.isArray(t.players)) {
      const cap = t.players.find((p) => p.isCaptain);
      if (cap && cap.name) {
        captainName = cap.name;
      }
    } else if (t.user && t.user.name) {
      captainName = t.user.name;
    }

    if (t.players && t.players.length > 0) {
      t.players.forEach((p) => {
        rows.push([
          `"${teamName.replace(/"/g, '""')}"`,
          `"${captainName.replace(/"/g, '""')}"`,
          `"${(p.name || '').replace(/"/g, '""')}"`,
          p.finalBidPrice != null ? p.finalBidPrice : (p.basePrice || 0),
        ]);
      });
    } else {
      rows.push([
        `"${teamName.replace(/"/g, '""')}"`,
        `"${captainName.replace(/"/g, '""')}"`,
        'None',
        '0',
      ]);
    }
  });

  const csv = rows.map((r) => r.join(',')).join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="DGPL_2026_Final_Squads.csv"'
  );
  return res.status(200).send(csv);
});
