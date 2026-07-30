const mongoose = require('mongoose');

const pairAnalyticsSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    totalSignals: { type: Number, default: 0 },
    tp1Hits: { type: Number, default: 0 },
    tp2Hits: { type: Number, default: 0 },
    tp3Hits: { type: Number, default: 0 },
    fullTpHits: { type: Number, default: 0 },
    originalSlHits: { type: Number, default: 0 },
    sl8Hits: { type: Number, default: 0 },
    sl10Hits: { type: Number, default: 0 },
    sl12Hits: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const PairAnalytics = mongoose.model('PairAnalytics', pairAnalyticsSchema);

module.exports = PairAnalytics;
