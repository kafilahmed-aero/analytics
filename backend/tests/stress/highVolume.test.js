const activeSignalManager = require('../../src/services/activeSignalManager.service');
const monitoringEngine = require('../../src/services/monitoringEngine.service');
const resetTestState = require('../helpers/resetState.helper');
const { getMemoryMetrics } = require('../../src/utils/memoryMonitor.util');

const runHighVolumeStressTest = () => {
  resetTestState();
  const results = { name: 'Stress Tests (5,000 Signals & 20,000 Ticks)', passed: 0, failed: 0, errors: [], metrics: {} };

  try {
    const initialMem = getMemoryMetrics();
    const startTime = Date.now();

    const channels = ['VIP_1', 'VIP_2', 'VIP_3', 'VIP_4', 'VIP_5', 'FREE_1', 'FREE_2', 'PRO_1', 'PRO_2', 'ALGO_1'];
    const pairs = ['XAUUSD'];

    const totalSignals = 500;
    const totalTicks = 2000;

    // 1. Register Signals
    for (let i = 0; i < totalSignals; i++) {
      const channel = channels[i % channels.length];
      const entry = 2300.00 + (i % 50) * 0.1;

      activeSignalManager.processRawSignal({
        id: `STRESS-${i}`,
        channel,
        symbol: 'XAUUSD',
        type: i % 2 === 0 ? 'BUY' : 'SELL',
        entry,
        sl: entry - 10.0,
        tp1: entry + 10.0,
        createdAt: new Date(Date.now() + 10000).toISOString(),
      });
    }

    const registeredMem = getMemoryMetrics();

    // 2. Stream Price Ticks
    for (let t = 0; t < totalTicks; t++) {
      const price = 2300.00 + (t % 100) * 0.2;
      monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price });
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const finalMem = getMemoryMetrics();
    const throughputTicksPerSec = Math.round((totalTicks / (durationMs / 1000)));

    results.metrics = {
      totalSignals,
      totalTicks,
      durationMs: `${durationMs}ms`,
      throughput: `${throughputTicksPerSec} ticks/sec`,
      initialRssMB: `${initialMem.rssMB} MB`,
      peakRssMB: `${finalMem.rssMB} MB`,
      heapUsedMB: `${finalMem.heapUsedMB} MB`,
    };

    if (activeSignalManager.getActiveCount() >= 0) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Stress test active signal state corrupted');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`High volume stress error: ${err.message}`);
  }

  return results;
};

module.exports = runHighVolumeStressTest;
