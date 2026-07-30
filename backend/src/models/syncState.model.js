const mongoose = require('mongoose');

const syncStateSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'sync_metadata',
    },
    lastCursor: {
      type: String,
      default: '',
    },
    lastSyncAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'syncState',
    timestamps: true,
  }
);

module.exports = mongoose.model('SyncState', syncStateSchema);
