const payloadContractGuard = require('../../src/services/payloadContractGuard.service');
const { normalizeSignal } = require('../../src/services/signalNormalizer.service');
const activeSignalManager = require('../../src/services/activeSignalManager.service');
const tickDispatcher = require('../../src/services/tickDispatcher.service');
const monitoringEngine = require('../../src/services/monitoringEngine.service');
const analyticsEngine = require('../../src/services/analyticsEngine.service');
const priceFeedHealthMonitor = require('../../src/services/priceFeedHealth.service');
const resetTestState = require('../helpers/resetState.helper');

const runFxDeskProRecoveryTests = () => {
  resetTestState();
  const results = { name: 'Integration Tests (FX Desk Pro Real Production Payload Recovery)', passed: 0, failed: 0, errors: [] };

  try {
    // Ensure tickDispatcher is wired to monitoringEngine
    tickDispatcher.setMonitoringEngine(monitoringEngine);

    // 1. Exact Live FX Desk Pro Payload Structure
    const rawFxDeskProSignal = {
      _id: '6a721884eda313d2e6eb938f',
      pair: 'XAUUSD',
      action: 'BUY',
      entry: 4090,
      targets: [4095, 4100, 4110],
      stopLoss: 4085,
      channel: 'Forex_Trades_MyBillion',
      createdAt: new Date().toISOString(),
      signalStatus: 'ACTIVE',
    };

    // Step 1: Signal Normalization
    const canonicalSignal = normalizeSignal(rawFxDeskProSignal);

    // Step 2: Payload Contract Guard Validation
    const guardRes = payloadContractGuard.validate(canonicalSignal);
    if (!guardRes.valid) {
      throw new Error(`Payload Contract Guard failed: ${guardRes.error}`);
    }

    if (
      canonicalSignal.id !== '6a721884eda313d2e6eb938f' ||
      canonicalSignal.direction !== 'BUY' ||
      canonicalSignal.entryPrice !== 4090 ||
      canonicalSignal.originalSl !== 4085 ||
      canonicalSignal.status !== 'ACTIVE'
    ) {
      throw new Error('Signal Normalization mapping contract mismatch');
    }

    // Step 3: Session Creation in SessionRegistry
    const sessionRes = activeSignalManager.processRawSignal(canonicalSignal);
    if (!sessionRes.success || !sessionRes.session) {
      throw new Error(`MonitoringSession creation failed: ${sessionRes.reason}`);
    }

    const session = sessionRes.session;
    if (session.status !== 'WAITING_PRICE' || activeSignalManager.getActiveCount() !== 1) {
      throw new Error('Session state transition to WAITING_PRICE failed');
    }

    // Step 4: Duplicate Ingestion Protection
    const duplicateRes = activeSignalManager.processRawSignal(canonicalSignal);
    if (duplicateRes.success || duplicateRes.reason !== 'duplicate_signal_ignored') {
      throw new Error('Duplicate signal ingestion protection failed');
    }

    // Step 5: Yahoo Live Market Price Tick Dispatch (TP1 Hit)
    const marketTimeISO = new Date().toISOString();
    tickDispatcher.processTick({
      symbol: 'XAUUSD',
      price: 4090.0, // Trigger entry
      marketTimestamp: marketTimeISO,
      sequence: 100,
    });
    tickDispatcher.processTick({
      symbol: 'XAUUSD',
      price: 4096.0,
      marketTimestamp: marketTimeISO,
      sequence: 101,
    });

    // Step 6: Price Comparison & Milestone Recording
    if (!session.recordedFlags.tp1Recorded || session.milestoneDollars.tp1Dollar <= 0) {
      throw new Error('TP1 milestone evaluation or dollar ledger calculation failed');
    }

    // Step 7: Dashboard Summary Update
    const summary = analyticsEngine.getOverallSummary();
    if (summary.totalSignalsProcessed !== 1 || summary.cumulativeHits.tp1Hits !== 1) {
      throw new Error('Dashboard summary aggregation failed');
    }

    // Step 8: Sequential TP Progression to Terminal Full TP & Session Eviction
    tickDispatcher.processTick({
      symbol: 'XAUUSD',
      price: 4102.0,
      marketTimestamp: marketTimeISO,
      sequence: 102,
    });

    tickDispatcher.processTick({
      symbol: 'XAUUSD',
      price: 4115.0,
      marketTimestamp: marketTimeISO,
      sequence: 103,
    });

    if (activeSignalManager.getActiveCount() !== 0) {
      throw new Error('Terminal session eviction failed');
    }

    // Step 9: Market Feed Health Check
    const health = priceFeedHealthMonitor.getHealthSummary();
    if (!health.lastMarketPrice || health.marketStatus !== 'OPEN') {
      throw new Error('Market feed health status tracking failed');
    }

    results.passed += 1;
  } catch (err) {
    results.failed += 1;
    results.errors.push(`FX Desk Pro Recovery Error: ${err.message}`);
  }

  return results;
};

module.exports = runFxDeskProRecoveryTests;
