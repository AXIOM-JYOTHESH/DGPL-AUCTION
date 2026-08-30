const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Email or password is incorrect', 401));
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRESIN || process.env.JWT_EXPIRES_IN || '7d',
  });

  // Hide password in response
  const userResponse = {
    _id: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.teamId,
    playerProfile: user.playerProfileId,
  };

  res.status(200).json({
    status: 'success',
    token,
    data: { user: userResponse },
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith('Bearer')
  ) {
    return next(new AppError('Please sign in to get access', 401));
  }

  const token = req.headers.authorization.split(' ')[1];
  let payLoad;
  try {
    payLoad = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401));
  }

  // Verify token issued time against global invalidation timestamp
  const cfg = await prisma.appConfig.findFirst();
  if (cfg && cfg.sessionsInvalidatedAt) {
    const issuedAtMs = (payLoad.iat || 0) * 1000;
    if (issuedAtMs < new Date(cfg.sessionsInvalidatedAt).getTime()) {
      return next(new AppError('Session expired. Please sign in again.', 401));
    }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: payLoad.id },
  });

  if (!currentUser) {
    return next(new AppError('Session invalid. User no longer exists.', 401));
  }

  req.user = currentUser;
  next();
});

exports.restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
