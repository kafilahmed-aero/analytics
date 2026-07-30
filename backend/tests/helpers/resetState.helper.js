const activeSignalManager = require('../../src/services/activeSignalManager.service');
const analyticsEngine = require('../../src/services/analyticsEngine.service');
const analyticsEvents = require('../../src/events/analyticsEvents');

const resetTestState = () => {
  // Clear active signals map, processed set, and reset boot timestamp watermark
  activeSignalManager.activeSignals.clear();
  activeSignalManager.processedSignalIds.clear();
  activeSignalManager.bootTimestamp = Date.now();

  // Clear analytics in-memory maps and dirty sets
  analyticsEngine.channelStats.clear();
  analyticsEngine.pairStats.clear();
  analyticsEngine.dirtyChannels.clear();
  analyticsEngine.dirtyPairs.clear();

  // Remove event listeners
  analyticsEvents.removeAllListeners('hit_updated');
  analyticsEvents.removeAllListeners('signal_completed');

  // Re-subscribe default AnalyticsEngine listeners
  analyticsEngine._initializeListeners();
};

module.exports = resetTestState;
