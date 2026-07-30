const activeSignalManager = require('../../src/services/activeSignalManager.service');
const monitoringEngine = require('../../src/services/monitoringEngine.service');
const analyticsEngine = require('../../src/services/analyticsEngine.service');
const resetTestState = require('../helpers/resetState.helper');

const runLifecycleTests = () => {
  resetTestState();
  const results = { name: 'Integration Tests (Lifecycle)', passed: 0, failed: 0, errors: [] };

  try {
    const rawSig = {
      id: 'LIFE-101',
      channel: 'LIFECYCLE_CH',
      symbol: 'USDJPY',
      type: 'BUY',
      entry: 155.00,
      sl: 154.50,
      tp1: 155.50,
      tp2: 156.00,
      tp3: 156.50,
      createdAt: new Date(Date.now() + 10000).toISOString(),
    };

    // 1. Process Signal
    activeSignalManager.processRawSignal(rawSig);

    // 2. Evaluate TP1
    monitoringEngine.processPriceTick('USDJPY', 155.60);
    const channelStats1 = analyticsEngine.channelStats.get('LIFECYCLE_CH');

    // 3. Evaluate TP2, TP3 & Full TP
    monitoringEngine.processPriceTick('USDJPY', 156.60);
    const channelStats2 = analyticsEngine.channelStats.get('LIFECYCLE_CH');

    if (
      channelStats1 && channelStats1.tp1Hits === 1 &&
      channelStats2 && channelStats2.fullTpHits === 1 &&
      channelStats2.totalSignals === 1 &&
      activeSignalManager.activeSignals.size === 0
    ) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Full signal lifecycle metrics verification failed');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Lifecycle error: ${err.message}`);
  }

  return results;
};

module.exports = runLifecycleTests;
