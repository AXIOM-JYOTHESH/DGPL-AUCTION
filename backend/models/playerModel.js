const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
  },
  isCaptain: {
    type: Boolean,
    default: false,
  },
  year: {
    type: Number,
  },
  image: {
    type: String,
  },
  category: {
    type: String,
    required: [true, 'Player category is required'],
    enum: {
      values: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
      message:
        'Category must be either Batsman, Bowler, All-Rounder, or Wicket-Keeper',
    },
  },
  basePrice: {
    type: Number,
    required: [
      function () {
        return !this.isCaptain;
      },
      'A non-captain player must have a base price',
    ],
  },
  status: {
    type: String,
    enum: {
      values: ['unsold', 'sold', 'in_auction'],
      message: 'Status must be either unsold, sold, or in_auction',
    },
    default: 'unsold',
  },
  team: {
    type: mongoose.Schema.ObjectId,
    ref: 'Team',
    default: null,
  },
  finalBidPrice: {
    type: Number,
  },
  bidHistory: [
    {
      team: {
        type: mongoose.Schema.ObjectId,
        ref: 'Team',
        required: true,
      },
      bidAmount: {
        type: Number,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Index to optimize queries filtering by status (e.g., unsold/in_auction)
playerSchema.index({ status: 1 });

const Player = mongoose.model('Player', playerSchema);
module.exports = Player;
