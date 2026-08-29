const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const User = require('./../models/userModel');
const AppConfig = require('./../models/appConfigModel');

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.checkPassword(password, user.password))) {
    return next(new AppError('Email or password is incorrect', 401));
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });

  user.password = undefined; // hide password in response

  res.status(200).json({
    status: 'success',
    token,
    data: { user },
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // only allow authorised captains to place bids..
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith('Bearer')
  ) {
    return next(new AppError('Please sign in to get access', 401));
  }
  // verifry the authenication
  const token = req.headers.authorization.split(' ')[1];
  const payLoad = jwt.verify(token, process.env.JWT_SECRET);
  // Verify token issued time against global invalidation timestamp
  const cfg = await AppConfig.findOne();
  if (cfg && cfg.sessionsInvalidatedAt) {
    const issuedAtMs = (payLoad.iat || 0) * 1000;
    if (issuedAtMs < new Date(cfg.sessionsInvalidatedAt).getTime()) {
      return next(new AppError('Session expired. Please sign in again.', 401));
    }
  }
  // check if user exists or not ..(may be deleted aftet oken intilisation )
  const currentUser = await User.findById(payLoad.id);
  if (!currentUser) {
    return next(new AppError('Session invalid. Please sign in again.', 401));
  }
  //give him access next();
  req.user = currentUser;
  next();
});

exports.restrictTo = (...allowedUsers) => {
  return (req, res, next) => {
    if (!allowedUsers.includes(req.user.role)) {
      return next(new AppError('You have no access to this route', 403));
    }
    next();
  };
};
