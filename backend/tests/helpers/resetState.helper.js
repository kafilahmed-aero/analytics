const activeSignalManager = require('../../src/services/activeSignalManager.service');
const analyticsEngine = require('../../src/services/analyticsEngine.service');
const analyticsEvents = require('../../src/events/analyticsEvents');

const resetTestState = () => {
  // Clear active sessions maps, processed set, and reset boot timestamp watermark
  if (activeSignalManager.sessions) activeSignalManager.sessions.clear();
  if (activeSignalManager.signalIdIndex) activeSignalManager.signalIdIndex.clear();
  if (activeSignalManager.messageKeyIndex) activeSignalManager.messageKeyIndex.clear();
  if (activeSignalManager.pairIndex) activeSignalManager.pairIndex.clear();
  if (activeSignalManager.channelIndex) activeSignalManager.channelIndex.clear();
  if (activeSignalManager.processedKeys) activeSignalManager.processedKeys.clear();
  activeSignalManager.bootTimestamp = Date.now();

  // Clear analytics in-memory maps and dirty sets
  if (analyticsEngine.channelStats) analyticsEngine.channelStats.clear();
  if (analyticsEngine.pairStats) analyticsEngine.pairStats.clear();
  if (analyticsEngine.dirtyChannels) analyticsEngine.dirtyChannels.clear();
  if (analyticsEngine.dirtyPairs) analyticsEngine.dirtyPairs.clear();

  // Remove event listeners
  analyticsEvents.removeAllListeners();
};

module.exports = resetTestState;
