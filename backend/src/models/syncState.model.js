/**
 * DEPRECATED IN ANALYTICS V2 PHASE 1
 * SyncState schema is retained as LEGACY for backward compatibility with V1 cursor metadata.
 * Analytics V2 persists MonitoringSession FSM states in the monitoringsessions collection.
 */
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
