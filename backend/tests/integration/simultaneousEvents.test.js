const activeSignalManager = require('../../src/services/activeSignalManager.service');
const monitoringEngine = require('../../src/services/monitoringEngine.service');
const analyticsEngine = require('../../src/services/analyticsEngine.service');
const resetTestState = require('../helpers/resetState.helper');

const runSimultaneousTests = () => {
  resetTestState();
  const results = { name: 'Integration Tests (Simultaneous Events)', passed: 0, failed: 0, errors: [] };

  try {
    // Register 2 opposing active signals for XAUUSD
    const buySig = {
      id: 'SIMUL-BUY',
      channel: 'CHANNEL_A',
      symbol: 'XAUUSD',
      type: 'BUY',
      entry: 2300.00,
      sl: 2290.00,
      tp1: 2310.00,
      tp2: 2320.00,
      createdAt: new Date(Date.now() + 10000).toISOString(),
    };

    const sellSig = {
      id: 'SIMUL-SELL',
      channel: 'CHANNEL_B',
      symbol: 'XAUUSD',
      type: 'SELL',
      entry: 2300.00,
      sl: 2310.00, // SL hit at 2310
      tp1: 2290.00,
      createdAt: new Date(Date.now() + 10000).toISOString(),
    };

    activeSignalManager.processRawSignal(buySig);
    activeSignalManager.processRawSignal(sellSig);

    // Single price tick to 2300.00 to trigger entry, then 2315.00 (triggers TP1 for BUY, SL for SELL)
    monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2300.00 }); // Trigger entry
    monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2315.00 });

    const statsA = analyticsEngine.channelStats.get('CHANNEL_A');
    const statsB = analyticsEngine.channelStats.get('CHANNEL_B');

    const tp1HitsA = statsA ? (statsA.totalTp1Hits !== undefined ? statsA.totalTp1Hits : statsA.tp1Hits) : 0;
    const slHitsB = statsB ? (statsB.totalOriginalSlHits !== undefined ? statsB.totalOriginalSlHits : statsB.originalSlHits) : 0;

    if (statsA && tp1HitsA === 1 && statsB && slHitsB === 1) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push(`Simultaneous mismatch: statsA=${JSON.stringify(statsA)}, statsB=${JSON.stringify(statsB)}`);
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Simultaneous test error: ${err.message}`);
  }

  return results;
};

module.exports = runSimultaneousTests;
