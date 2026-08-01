const mongoose = require('mongoose');

const channelAnalyticsSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    totalSignalsProcessed: {
      type: Number,
      default: 0,
    },
    
    // Independent TP Milestone Hit Counts and Dollar Totals
    totalTp1Hits: { type: Number, default: 0 },
    totalTp1Dollars: { type: Number, default: 0 },

    totalTp2Hits: { type: Number, default: 0 },
    totalTp2Dollars: { type: Number, default: 0 },

    totalTp3Hits: { type: Number, default: 0 },
    totalTp3Dollars: { type: Number, default: 0 },

    totalFullTpHits: { type: Number, default: 0 },
    totalFullTpDollars: { type: Number, default: 0 },

    // Independent SL Milestone Hit Counts and Dollar Totals
    totalSl8Hits: { type: Number, default: 0 },
    totalSl8Dollars: { type: Number, default: 0 },

    totalSl10Hits: { type: Number, default: 0 },
    totalSl10Dollars: { type: Number, default: 0 },

    totalSl12Hits: { type: Number, default: 0 },
    totalSl12Dollars: { type: Number, default: 0 },

    totalOriginalSlHits: { type: Number, default: 0 },
    totalOriginalSlDollars: { type: Number, default: 0 },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'channelanalytics',
    timestamps: true,
  }
);

module.exports = mongoose.model('ChannelAnalytics', channelAnalyticsSchema);
