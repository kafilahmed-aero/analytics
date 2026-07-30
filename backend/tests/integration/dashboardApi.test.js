const processChannelQuery = require('../../src/utils/dashboardQuery.util');
const resetTestState = require('../helpers/resetState.helper');

const runDashboardApiTests = () => {
  resetTestState();
  const results = { name: 'Integration Tests (Dashboard Channel API & Auto-Ranking)', passed: 0, failed: 0, errors: [] };

  const sampleDataset = [
    { identifier: 'VIP_ALGO', totalSignals: 100, fullTpHits: 70 },
    { identifier: 'FREE_CHANNEL', totalSignals: 25, fullTpHits: 10 },
    { identifier: 'VIP_SWING', totalSignals: 150, fullTpHits: 90 },
    { identifier: 'PRO_SCALPER', totalSignals: 5, fullTpHits: 2 },
  ];

  // Test 1: Automatic Ranking (Total Signals DESC) & Search
  try {
    const res = processChannelQuery(sampleDataset, { search: 'VIP' });
    if (res.channels.length === 2 && res.channels[0].identifier === 'VIP_SWING' && res.channels[1].identifier === 'VIP_ALGO') {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Dashboard channel search and auto-ranking mismatch');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Dashboard search error: ${err.message}`);
  }

  // Test 2: Unfiltered Auto-Ranking Format
  try {
    const res = processChannelQuery(sampleDataset);
    if (res.channels.length === 4 && res.channels[0].identifier === 'VIP_SWING' && res.channels[3].identifier === 'PRO_SCALPER') {
      results.passed += 1;
    } else {
      results.failed += 1;
      results.errors.push('Dashboard channel auto-ranking output mismatch');
    }
  } catch (err) {
    results.failed += 1;
    results.errors.push(`Dashboard auto-ranking error: ${err.message}`);
  }

  return results;
};

module.exports = runDashboardApiTests;
