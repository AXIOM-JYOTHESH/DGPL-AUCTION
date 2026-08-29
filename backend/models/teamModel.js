const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true,
  },
  captain: {
    type: mongoose.Schema.ObjectId,
    ref: 'Player',
  },
  image: {
    type: String,
  },
  budget: {
    type: Number,
    default: 100,
  },
  players: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Player',
    },
  ],
});

// Index to speed up captain lookups
teamSchema.index({ captain: 1 });

// Ensure the captain is always included in the players list when saving a Team
teamSchema.pre('save', function (next) {
  try {
    if (this.captain) {
      const cap = this.captain.toString();
      this.players = this.players || [];
      const hasCap = this.players.some((p) => p && p.toString() === cap);
      if (!hasCap) this.players.push(this.captain);
    }
  } catch (_) {
    // ignore
  }
  next();
});

// Ensure updates that set a captain also include them in players
teamSchema.pre('findOneAndUpdate', function (next) {
  try {
    const update = this.getUpdate() || {};
    // Support both direct set and $set
    const newCaptain = update.captain || (update.$set && update.$set.captain);
    if (newCaptain) {
      // Use $addToSet to avoid duplicates
      if (!update.$addToSet) update.$addToSet = {};
      // If players already has an $addToSet, merge
      const addToSet = update.$addToSet;
      if (addToSet.players && addToSet.players.$each) {
        // Already using $each → append captain if not present
        const arr = addToSet.players.$each;
        if (!arr.some((p) => p && p.toString() === newCaptain.toString())) {
          arr.push(newCaptain);
        }
      } else if (addToSet.players && !addToSet.players.$each) {
        // Single value present; convert to $each array if needed
        const existing = addToSet.players;
        if (existing.toString() !== newCaptain.toString()) {
          addToSet.players = { $each: [existing, newCaptain] };
        }
      } else {
        addToSet.players = newCaptain;
      }
      this.setUpdate(update);
    }
  } catch (_) {
    // ignore
  }
  next();
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
