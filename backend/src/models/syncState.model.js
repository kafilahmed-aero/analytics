const mongoose = require('mongoose');

const syncStateSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'sync_metadata',
    },
    baselineWatermark: {
      type: Date,
      default: () => new Date('2026-08-12T09:21:12.000Z'),
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
