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
      symbol: 'XAUUSD',
      type: 'BUY',
      entry: 2300.00,
      sl: 2290.00,
      tp1: 2310.00,
      tp2: 2320.00,
      tp3: 2330.00,
      createdAt: new Date(Date.now() + 10000).toISOString(),
    };

    // 1. Process Signal
    activeSignalManager.processRawSignal(rawSig);

    // 2. Evaluate TP1
    monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2300.00 }); // Trigger entry
    monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2315.00 });
    const channelStats1 = analyticsEngine.channelStats.get('LIFECYCLE_CH');

    // 3. Evaluate TP2 & Full TP (TP3)
    monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2325.00 });
    monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2335.00 });
    const channelStats2 = analyticsEngine.channelStats.get('LIFECYCLE_CH');

    if (
      channelStats1 && (channelStats1.totalTp1Hits === 1 || channelStats1.tp1Hits === 1) &&
      channelStats2 && (channelStats2.totalFullTpHits === 1 || channelStats2.fullTpHits === 1) &&
      (channelStats2.totalSignalsProcessed === 1 || channelStats2.totalSignals === 1) &&
      activeSignalManager.getActiveCount() === 0
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
