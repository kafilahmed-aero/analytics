const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');
const { parseEntryPrice } = require('../src/utils/entryParser');
const activeSignalManager = require('../src/services/activeSignalManager.service');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    const activeStatuses = ['CREATED', 'VALIDATED', 'REGISTERED', 'HYDRATED', 'WAITING_PRICE', 'MONITORING'];
    const sessions = await MonitoringSession.find({ status: { $in: activeStatuses } }).lean();

    console.log(`Checking ${sessions.length} active sessions for entry price range updates...`);

    let updatedCount = 0;

    for (const session of sessions) {
      let averagedEntry = parseEntryPrice(session.entryPrice);

      // Handle the specific 12:21 PM signal from TRADEWITHUK500 which is range 4170-4174 (average 4172)
      if (session.sessionId === 'SESS_6a72dd7f0d6280e5abc8519a') {
        averagedEntry = 4172.00;
      }

      if (averagedEntry !== session.entryPrice && !isNaN(averagedEntry)) {
        console.log(`Migrating session ${session.sessionId} (${session.channel}):`);
        console.log(`  - Old Stored Entry: ${session.entryPrice}`);
        console.log(`  - New Averaged Entry: ${averagedEntry}`);

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

        console.log(`  - New SL Queue:`, newSlQueue.map(s => `${s.name}: ${s.price}`).join(', '));
        console.log(`  - New TP Queue:`, newTpQueue.map(t => `L${t.level}: ${t.price} (${t.isFullTp ? 'FULL' : 'NON-FULL'})`).join(', '));

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

        updatedCount++;
      }
    }

    console.log(`Successfully migrated ${updatedCount} sessions.`);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
