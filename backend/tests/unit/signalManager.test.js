const activeSignalManager = require('../../src/services/activeSignalManager.service');
const resetTestState = require('../helpers/resetState.helper');

const runUnitTests = () => {
  resetTestState();
  const results = { name: 'Unit Tests (ActiveSignalManager)', passed: 0, failed: 0, errors: [] };

  // Test 1: Duplicate Signal Processing Rejection
  try {
    const rawSig = {
      id: 'UNIT-DUP-001',
      channel: 'VIP_ALGO',
      symbol: 'XAUUSD',
      type: 'BUY',
      entry: 2300.00,
      sl: 2290.00,
      tp1: 2310.00,
      createdAt: new Date(Date.now() + 10000).toISOString(),
    };

    const firstResult = activeSignalManager.processRawSignal(rawSig);
    const secondResult = activeSignalManager.processRawSignal(rawSig);

    if (
      firstResult.success === true &&
      secondResult.success === false &&
      secondResult.reason === 'duplicate_signal_ignored' &&
      activeSignalManager.getActiveCount() === 1
    ) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Duplicate signal was not rejected cleanly');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Duplicate signal error: ${err.message}`);
  }

  // Test 2: Historical Watermark Rejection
  try {
    resetTestState();
    const oldSig = {
      id: 'UNIT-OLD-002',
      channel: 'VIP_ALGO',
      symbol: 'XAUUSD',
      type: 'BUY',
      entry: 2300.00,
      sl: 2290.00,
      tp1: 2310.00,
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour old
    };

    const result = activeSignalManager.processRawSignal(oldSig);

    if (
      result.success === false &&
      result.reason === 'historical_signal_ignored' &&
      activeSignalManager.getActiveCount() === 0
    ) {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Historical signal older than watermark was not rejected');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Historical signal error: ${err.message}`);
  }

  // Test 3: Entry Price Parsing and Range Averaging
  try {
    const { parseEntryPrice } = require('../../src/utils/entryParser');

    const cases = [
      { input: '4170-4174', expected: 4172 },
      { input: '4170 to 4174', expected: 4172 },
      { input: '4170/4174', expected: 4172 },
      { input: '4170_4174', expected: 4172 },
      { input: '4165.4164', expected: 4164.5 },
      { input: 4174, expected: 4174 },
      { input: '4174.50', expected: 4174.5 },
      { input: '4165.500', expected: 4165.5 },
    ];

    let allCasesPassed = true;
    for (const c of cases) {
      const res = parseEntryPrice(c.input);
      if (res !== c.expected) {
        allCasesPassed = false;
        results.errors.push(`Entry parser failed for input "${c.input}": expected ${c.expected}, got ${res}`);
      }
    }

    if (allCasesPassed) {
      results.passed += 1;
    } else {
      results.failed += 1;
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Entry parser unit test error: ${err.message}`);
  }

  return results;
};

module.exports = runUnitTests;
