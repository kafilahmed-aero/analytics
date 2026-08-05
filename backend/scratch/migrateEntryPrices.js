const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');
const fxDeskProService = require('../src/services/fxdeskpro.service');
const { parseEntryPrice } = require('../src/utils/entryParser');
const activeSignalManager = require('../src/services/activeSignalManager.service');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    console.log('Fetching active signals from FX Desk Pro...');
    const response = await fxDeskProService.fetchActiveSignals();
    const payload = response.data || response || {};
    const rawSignals = payload.signals || payload.data || (Array.isArray(payload) ? payload : []);
    
    console.log(`Fetched ${rawSignals.length} active signals from FX Desk Pro.`);

    let updatedCount = 0;

    for (const sig of rawSignals) {
      const signalId = String(sig.id || sig._id || sig.signalId);
      const session = await MonitoringSession.findOne({ signalId });
      
      if (!session) {
        console.log(`No active session found for signalId ${signalId}.`);
        continue;
      }

      const rawEntry = sig.entry || sig.entryPrice || sig.entryPoint;
      const averagedEntry = parseEntryPrice(rawEntry);
      
      if (isNaN(averagedEntry)) {
        console.warn(`Could not parse entry for signal ${signalId}: ${rawEntry}`);
        continue;
      }

      console.log(`Updating session ${session.sessionId}:`);
      console.log(`  - Raw Entry String: "${rawEntry}"`);
      console.log(`  - Old Stored Entry: ${session.entryPrice}`);
      console.log(`  - New Averaged Entry: ${averagedEntry}`);

      // Rebuild queues using the new entry price and corrected logic/PIP_SIZE = 1.00
      const originalSlItem = session.slQueue.find((s) => s.name === 'ORIGINAL_SL');
      if (!originalSlItem) {
        console.warn(`  - [Warning] No original SL found. Skipping.`);
        continue;
      }
      
      const newSlQueue = activeSignalManager.buildAdaptiveSlQueue(
        session.direction,
        averagedEntry,
        originalSlItem.price
      );

      const newTpQueue = activeSignalManager.buildTpQueue(session.originalTpList);

      await MonitoringSession.updateOne(
        { _id: session._id },
        {
          $set: {
            entryPrice: averagedEntry,
            slQueue: newSlQueue,
            tpQueue: newTpQueue,
            isDirty: true
          }
        }
      );

      console.log(`  - Updated successfully.`);
      updatedCount++;
    }

    console.log(`Migration complete. Updated ${updatedCount} sessions.`);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
