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

    analyticsEngine.recordCompletedOutcome(outcome1);
    analyticsEngine.recordCompletedOutcome(outcome2);

    const channelStats = analyticsEngine.getChannelAnalytics();
    const vipChannel = channelStats.find((c) => c.identifier === 'VIP_TEST');

    if (
      vipChannel &&
      vipChannel.totalSignals === 2 &&
      vipChannel.fullTpHits === 1 &&
      vipChannel.originalSlHits === 1
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
    const channelStats = analyticsEngine.getChannelAnalytics();
    if (channelStats.length === 1 && channelStats[0].totalSignals === 2) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Idempotent metric validation failed');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Outcome sync idempotency test error: ${err.message}`);
  }

  return results;
};

module.exports = runOutcomeSyncTests;
