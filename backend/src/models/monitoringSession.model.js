const mongoose = require('mongoose');

const tpQueueItemSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    price: { type: Number, required: true },
    isFullTp: { type: Boolean, default: false },
  },
  { _id: false }
);

const slQueueItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    pipDistance: { type: Number, required: true },
    isTerminal: { type: Boolean, default: false },
  },
  { _id: false }
);

const milestoneHistorySchema = new mongoose.Schema(
  {
    milestone: { type: String, required: true },
    price: { type: Number, required: true },
    dollarValue: { type: Number, required: true, default: 0 },
    timestamp: { type: Date, default: Date.now },
    direction: { type: String, required: true },
    signalId: { type: String, required: true },
    channel: { type: String, required: true },
  },
  { _id: false }
);

const monitoringSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    signalId: { type: String, required: true, unique: true },
    messageKey: { type: String, required: true, unique: true },

    pair: { type: String, required: true, default: 'XAUUSD', index: true },
    channel: { type: String, required: true, index: true },
    direction: { type: String, required: true, enum: ['BUY', 'SELL'] },
    entryPrice: { type: Number, required: true },
    fixedLotSize: { type: Number, default: 0.01 },

    originalTpList: [{ type: Number }],
    tpQueue: [tpQueueItemSchema],
    activeTpPointer: { type: Number, default: 0 },

    slQueue: [slQueueItemSchema],
    activeSlPointer: { type: Number, default: 0 },

    status: {
      type: String,
      required: true,
      enum: [
        'CREATED',
        'VALIDATED',
        'REGISTERED',
        'HYDRATED',
        'WAITING_PRICE',
        'MONITORING',
        'COMPLETED_FULL_TP',
        'COMPLETED_ORIGINAL_SL',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'REGISTERED',
      index: true,
    },

    // Boolean Hit Flags to prevent duplicate milestone recording
    recordedFlags: {
      tp1Recorded: { type: Boolean, default: false },
      tp2Recorded: { type: Boolean, default: false },
      tp3Recorded: { type: Boolean, default: false },
      fullTpRecorded: { type: Boolean, default: false },
      sl8Recorded: { type: Boolean, default: false },
      sl10Recorded: { type: Boolean, default: false },
      sl12Recorded: { type: Boolean, default: false },
      originalSlRecorded: { type: Boolean, default: false },
    },

    // Independent Milestone Dollar Records (Raw measurements only)
    milestoneDollars: {
      tp1Dollar: { type: Number, default: 0 },
      tp2Dollar: { type: Number, default: 0 },
      tp3Dollar: { type: Number, default: 0 },
      fullTpDollar: { type: Number, default: 0 },
      sl8Dollar: { type: Number, default: 0 },
      sl10Dollar: { type: Number, default: 0 },
      sl12Dollar: { type: Number, default: 0 },
      originalSlDollar: { type: Number, default: 0 },
    },

    milestoneHistory: [milestoneHistorySchema],

    createdAt: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    lastTickPrice: { type: Number, default: null },

    isDirty: { type: Boolean, default: true },
    isHydrated: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

monitoringSessionSchema.index({ pair: 1, status: 1 });
monitoringSessionSchema.index({ channel: 1, status: 1 });

const MonitoringSessionModel = mongoose.model('MonitoringSession', monitoringSessionSchema, 'monitoringsessions');

module.exports = MonitoringSessionModel;
