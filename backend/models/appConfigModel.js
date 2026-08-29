const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    sessionsInvalidatedAt: { type: Date, default: Date.now },
  },
  { collection: 'appconfig' }
);

module.exports = mongoose.model('AppConfig', appConfigSchema);
