const analyticsEngine = require('../../src/services/analyticsEngine.service');
const resetTestState = require('../helpers/resetState.helper');

const runFailureTests = async () => {
  resetTestState();
  const results = { name: 'Integration Tests (Failure & Shutdown Scenarios)', passed: 0, failed: 0, errors: [] };

  // Test 1: Flush Execution when dirty records exist (offline DB fallback)
  try {
    const persistenceService = require('../../src/services/persistence.service');
    const originalFlush = persistenceService.flushDirtyRecords;
    persistenceService.flushDirtyRecords = async () => ({ flushedChannels: 1, flushedPairs: 1 });

    analyticsEngine.recordMilestoneHit('FAIL_CHANNEL', 'TP1', 10.0);
    const isDirty = analyticsEngine.dirtyChannels.has('FAIL_CHANNEL') && analyticsEngine.dirtyPairs.has('XAUUSD');

    const flushRes = await analyticsEngine.flushDirtyAnalytics();
    const isCleared = analyticsEngine.dirtyChannels.size === 0 && analyticsEngine.dirtyPairs.size === 0;

    persistenceService.flushDirtyRecords = originalFlush;

    if (isDirty && isCleared) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Dirty set clearing during flush execution failed');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Flush execution error: ${err.message}`);
  }

  return results;
};

module.exports = runFailureTests;
