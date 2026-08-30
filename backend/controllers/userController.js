const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// CREATE A NEW USER
exports.createUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role, teamId, playerProfileId } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'captain',
      teamId: teamId || null,
      playerProfileId: playerProfileId || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      playerProfileId: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      data: {
        _id: user.id,
        id: user.id,
        ...user,
      },
    },
  });
});

// GET ALL USERS
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await prisma.user.findMany({
    include: {
      team: true,
      playerProfile: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const formatted = users.map((u) => ({
    _id: u.id,
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    team: u.teamId,
    playerProfile: u.playerProfileId,
    teamData: u.team,
    playerProfileData: u.playerProfile,
  }));

  res.status(200).json({
    status: 'success',
    results: formatted.length,
    data: { users: formatted },
  });
});

// GET A SINGLE USER BY ID
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      team: true,
      playerProfile: true,
    },
  });

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      doc: {
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team: user.teamId,
        playerProfile: user.playerProfileId,
        teamData: user.team,
        playerProfileData: user.playerProfile,
      },
    },
  });
});

// UPDATE A USER
exports.updateUser = catchAsync(async (req, res, next) => {
  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData._id;

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 12);
  }
  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase().trim();
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      playerProfileId: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      doc: {
        _id: user.id,
        id: user.id,
        ...user,
      },
    },
  });
});

// DELETE A USER
exports.deleteUser = catchAsync(async (req, res, next) => {
  await prisma.user.delete({
    where: { id: req.params.id },
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
