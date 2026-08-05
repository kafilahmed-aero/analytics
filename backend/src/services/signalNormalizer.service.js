const { parseEntryPrice } = require('../utils/entryParser');

/** Converts FX Desk Pro and legacy Analytics fields into one session contract. */
const normalizeSignal = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  let rawId = source.id ?? source._id ?? source.signalId;
  if (rawId && typeof rawId === 'object' && rawId.toString) {
    rawId = rawId.toString();
  }
  const targets = Array.isArray(source.targets) ? source.targets : (Array.isArray(source.tps) ? source.tps : []);
  const legacyTargets = [source.tp1, source.tp2, source.tp3, source.tp4, source.tp5]
    .filter((value) => value !== undefined && value !== null);

  let averagedEntryPrice;
  if (Array.isArray(source.entryRange) && source.entryRange.length > 0) {
    if (source.entryRange.length >= 2) {
      averagedEntryPrice = source.entryRange.reduce((a, b) => a + b, 0) / source.entryRange.length;
    } else {
      averagedEntryPrice = parseEntryPrice(source.entryRange[0]);
    }
  } else {
    averagedEntryPrice = parseEntryPrice(source.entryPrice ?? source.entry);
  }

  return {
    id: rawId ? String(rawId) : undefined,
    pair: source.pair || source.symbol,
    direction: source.direction || source.type || source.action,
    entryPrice: averagedEntryPrice,
    originalSl: source.originalSl ?? source.sl ?? source.stopLoss,
    targets: targets.length > 0 ? targets : legacyTargets,
    channel: source.channel,
    messageId: source.messageId || (rawId ? String(rawId) : undefined),
    createdAt: source.createdAt || source.timestamp || source.createdAtDate,
    status: source.status || source.signalStatus,
    fixedLotSize: source.fixedLotSize || source.lotSize || source.fixedLot,
  };
};

module.exports = { normalizeSignal };
