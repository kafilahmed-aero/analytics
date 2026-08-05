const activeSignalManager = require('../src/services/activeSignalManager.service');
const monitoringEngine = require('../src/services/monitoringEngine.service');
const analyticsEngine = require('../src/services/analyticsEngine.service');
const tickDispatcher = require('../src/services/tickDispatcher.service');
const resetTestState = require('../tests/helpers/resetState.helper');

const runVerification = () => {
  resetTestState();
  tickDispatcher.setMonitoringEngine(monitoringEngine);

  console.log('--- Verification Test Start ---');

  const rawSignal = {
    id: 'VERIFY-101',
    channel: 'VERIFY_MATH',
    symbol: 'XAUUSD',
    type: 'BUY',
    entry: 2000.00,
    sl: 1960.00,
    tp1: 2010.00,
    tp2: 2020.00,
    tp3: 2030.00,
    createdAt: new Date().toISOString(),
    signalStatus: 'ACTIVE',
  };

  // 1. Process Signal
  const registerRes = activeSignalManager.processRawSignal(rawSignal);
  if (!registerRes.success) {
    console.error('Failed to register signal:', registerRes.reason);
    return;
  }
  const session = registerRes.session;
  console.log('Signal registered successfully.');
  console.log('Stop Loss Queue prices:');
  session.slQueue.forEach((sl) => {
    console.log(`  - ${sl.name}: price = ${sl.price}, distance = ${sl.pipDistance}`);
  });

  // Verify SL prices are correct with PIP_SIZE = 1.00
  const expectedSl8 = 1992.00;
  const expectedSl10 = 1990.00;
  const expectedSl12 = 1988.00;

  const sl8 = session.slQueue.find(s => s.name === 'SL8');
  const sl10 = session.slQueue.find(s => s.name === 'SL10');
  const sl12 = session.slQueue.find(s => s.name === 'SL12');

  if (sl8.price !== expectedSl8 || sl10.price !== expectedSl10 || sl12.price !== expectedSl12) {
    console.error('❌ FAILED: Derived SL prices mismatch with PIP_SIZE = 1.00!');
    console.error(`Expected: SL8=${expectedSl8}, SL10=${expectedSl10}, SL12=${expectedSl12}`);
    console.error(`Actual: SL8=${sl8.price}, SL10=${sl10.price}, SL12=${sl12.price}`);
  } else {
    console.log('✅ PASS: Derived SL prices are correct.');
  }

  // 2. Send price update to hit entry
  console.log('Sending price tick 2000.00 (trigger entry)...');
  monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2000.00 });

  // 3. Send price update to hit SL8 and SL10 (down to 1989.50)
  console.log('Sending price tick 1989.50 (hits SL8 and SL10)...');
  monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 1989.50 });

  // Verify SL milestone dollar values in session and analytics engine
  const stats = analyticsEngine.channelStats.get('VERIFY_MATH');
  console.log('Recorded Milestone Dollars in Session:', session.milestoneDollars);
  console.log('Realtime Analytics Engine channel stats (SL):');
  console.log(`  - totalSl8Hits: ${stats.totalSl8Hits}, totalSl8Dollars: ${stats.totalSl8Dollars}`);
  console.log(`  - totalSl10Hits: ${stats.totalSl10Hits}, totalSl10Dollars: ${stats.totalSl10Dollars}`);

  if (session.milestoneDollars.sl8Dollar !== 8.00 || stats.totalSl8Dollars !== 8.00) {
    console.error('❌ FAILED: SL8 dollar value mismatch! Expected $8.00');
  } else {
    console.log('✅ PASS: SL8 dollar value is exactly $8.00');
  }

  if (session.milestoneDollars.sl10Dollar !== 10.00 || stats.totalSl10Dollars !== 10.00) {
    console.error('❌ FAILED: SL10 dollar value mismatch! Expected $10.00');
  } else {
    console.log('✅ PASS: SL10 dollar value is exactly $10.00');
  }

  // 4. Send price updates sequentially to hit TP1, TP2, TP3
  console.log('Sending price tick 2012.00 (hits TP1)...');
  monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2012.00 });

  console.log('Sending price tick 2022.00 (hits TP2)...');
  monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2022.00 });

  console.log('Sending price tick 2032.00 (hits TP3 / Full TP)...');
  monitoringEngine.processPriceTick({ symbol: 'XAUUSD', price: 2032.00 });

  console.log('Realtime Analytics Engine channel stats (TP):');
  console.log(`  - totalTp1Hits: ${stats.totalTp1Hits}, totalTp1Dollars: ${stats.totalTp1Dollars}`);
  console.log(`  - totalTp2Hits: ${stats.totalTp2Hits}, totalTp2Dollars: ${stats.totalTp2Dollars}`);
  console.log(`  - totalTp3Hits: ${stats.totalTp3Hits}, totalTp3Dollars: ${stats.totalTp3Dollars}`);
  console.log(`  - totalFullTpHits: ${stats.totalFullTpHits}, totalFullTpDollars: ${stats.totalFullTpDollars}`);

  // Since TP3 is the 3rd and final TP (isFullTp = true), it should ONLY update the FULL_TP column, and NOT the TP3 column!
  const expectedTp3Dollars = 0.00;
  const expectedFullTpDollars = 30.00;

  if (stats.totalTp3Hits !== 0 || stats.totalTp3Dollars !== expectedTp3Dollars) {
    console.error(`❌ FAILED: TP3 statistics mismatch! Expected Hits: 0, Dollars: ${expectedTp3Dollars}. Actual Hits: ${stats.totalTp3Hits}, Dollars: ${stats.totalTp3Dollars}`);
  } else {
    console.log('✅ PASS: TP3 statistics remained at 0 (exclusive FULL_TP mapping).');
  }

  if (stats.totalFullTpHits !== 1 || stats.totalFullTpDollars !== expectedFullTpDollars) {
    console.error(`❌ FAILED: FULL_TP statistics mismatch! Expected Hits: 1, Dollars: ${expectedFullTpDollars}. Actual Hits: ${stats.totalFullTpHits}, Dollars: ${stats.totalFullTpDollars}`);
  } else {
    console.log('✅ PASS: FULL_TP statistics updated correctly.');
  }

  console.log('--- Verification Test Complete ---');
};

runVerification();
