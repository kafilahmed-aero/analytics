const activeSignalManager = require('../../src/services/activeSignalManager.service');
const monitoringEngine = require('../../src/services/monitoringEngine.service');
const analyticsEngine = require('../../src/services/analyticsEngine.service');
const resetTestState = require('../helpers/resetState.helper');

const runSimultaneousTests = () => {
  resetTestState();
  const results = { name: 'Integration Tests (Simultaneous Events)', passed: 0, failed: 0, errors: [] };

  try {
    // Register 2 opposing active signals for EURUSD
    const buySig = {
      id: 'SIMUL-BUY',
      channel: 'CHANNEL_A',
      symbol: 'EURUSD',
      type: 'BUY',
      entry: 1.0800,
      sl: 1.0750,
      tp1: 1.0850,
      createdAt: new Date(Date.now() + 10000).toISOString(),
    };

    const sellSig = {
      id: 'SIMUL-SELL',
      channel: 'CHANNEL_B',
      symbol: 'EURUSD',
      type: 'SELL',
      entry: 1.0800,
      sl: 1.0850, // SL hit at 1.0850
      tp1: 1.0750,
      createdAt: new Date(Date.now() + 10000).toISOString(),
    };

    activeSignalManager.processRawSignal(buySig);
    activeSignalManager.processRawSignal(sellSig);

    // Single price tick to 1.0855 (triggers TP1 for BUY, SL for SELL)
    monitoringEngine.processPriceTick('EURUSD', 1.0855);

    const statsA = analyticsEngine.channelStats.get('CHANNEL_A');
    const statsB = analyticsEngine.channelStats.get('CHANNEL_B');

    if (statsA && statsA.tp1Hits === 1 && statsB && statsB.originalSlHits === 1) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Simultaneous multi-signal tick evaluation metrics mismatch');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Simultaneous test error: ${err.message}`);
  }

  return results;
};

module.exports = runSimultaneousTests;
