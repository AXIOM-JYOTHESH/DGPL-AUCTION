const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

// CREATE A NEW USER
exports.createUser = handlerFactory.createOne(User);

// GET ALL USERS
exports.getAllUsers = handlerFactory.getAll(User);

// GET A SINGLE USER BY ID
exports.getUser = handlerFactory.getOne(User);

// UPDATE A USER
exports.updateUser = handlerFactory.updateOne(User);

// DELETE A USER
exports.deleteUser = handlerFactory.deleteOne(User);
