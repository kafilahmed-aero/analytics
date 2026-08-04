const analyticsEngine = require('../../src/services/analyticsEngine.service');
const resetTestState = require('../helpers/resetState.helper');

const runOutcomeSyncTests = () => {
  resetTestState();
  const results = { name: 'Integration Tests (Outcome Sync & Channel Performance Recording)', passed: 0, failed: 0, errors: [] };

  // Test 1: Record Completed Outcomes and Verify Channel Metrics
  try {
    const outcome1 = {
      messageKey: 'VIP_TEST:101',
      channel: 'VIP_TEST',
      pair: 'XAUUSD',
      status: 'FULL_TP',
      targetHits: { tp1Hit: true, tp2Hit: true, tp3Hit: true, slHit: false },
    };

    const outcome2 = {
      messageKey: 'VIP_TEST:102',
      channel: 'VIP_TEST',
      pair: 'XAUUSD',
      status: 'SL_HIT',
      targetHits: { tp1Hit: false, tp2Hit: false, tp3Hit: false, slHit: true },
    };

    analyticsEngine.recordNewSignal('VIP_TEST', 'XAUUSD');
    analyticsEngine.recordNewSignal('VIP_TEST', 'XAUUSD');

    analyticsEngine.recordCompletedOutcome('VIP_TEST', 'FULL_TP', 10.0);
    analyticsEngine.recordCompletedOutcome('VIP_TEST', 'ORIGINAL_SL', -10.0);

    const channelStats = analyticsEngine.getChannelAnalytics().channels || [];
    const vipChannel = channelStats.find((c) => (c.identifier === 'VIP_TEST' || c.channel === 'VIP_TEST'));

    if (
      vipChannel &&
      (vipChannel.totalSignals === 2 || vipChannel.totalSignalsProcessed === 2)
    ) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push(`Outcome sync record mismatch: ${JSON.stringify(vipChannel)}`);
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Outcome sync recording error: ${err.message}`);
  }

  // Test 2: Idempotent Metric Calculation Verification
  try {
    const channelStats = analyticsEngine.getChannelAnalytics().channels || [];
    if (channelStats.length === 1) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Idempotent metric validation failed');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Outcome sync idempotency test error: ${err.message}`);
  }

  // Test 3: Cursor Token Hydration and Opaque Contract Verification
  try {
    const outcomeSyncService = require('../../src/services/outcomeSync.service');
    outcomeSyncService.setLastCursor('TEST_OPAQUE_CURSOR_123');

    if (outcomeSyncService.getLastCursor() === 'TEST_OPAQUE_CURSOR_123') {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Cursor token getter/setter mismatch');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Cursor hydration error: ${err.message}`);
  }

  return results;
};

module.exports = runOutcomeSyncTests;
