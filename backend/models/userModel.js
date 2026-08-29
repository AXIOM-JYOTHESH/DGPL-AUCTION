const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: {
    type: String,
    required: [true, 'User must have an email'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (val) {
        return validator.isEmail(val);
      },
      message: 'Please provide a valid email address',
    },
  },
  role: { type: String },
  password: {
    type: String,
    required: [true, 'User must have a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  team: {
    type: mongoose.Schema.ObjectId,
    ref: 'Team',
  },
  playerProfile: {
    type: mongoose.Schema.ObjectId,
    ref: 'Player',
  },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// wecreate a instance function to check the user password ..
userSchema.methods.checkPassword = async function (
  CandidatePassword,
  userPassword
) {
  return await bcrypt.compare(CandidatePassword, userPassword);
};
const User = mongoose.model('User', userSchema);

module.exports = User;
