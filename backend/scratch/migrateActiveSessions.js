const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');
const activeSignalManager = require('../src/services/activeSignalManager.service');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    const activeStatuses = ['CREATED', 'VALIDATED', 'REGISTERED', 'HYDRATED', 'WAITING_PRICE', 'MONITORING'];
    const activeSessions = await MonitoringSession.find({ status: { $in: activeStatuses } }).lean();

    console.log(`Found ${activeSessions.length} active sessions to migrate.`);

    let migratedCount = 0;

    for (const session of activeSessions) {
      const originalSlItem = session.slQueue.find((s) => s.name === 'ORIGINAL_SL');
      if (!originalSlItem) {
        console.warn(`[Warning] No original SL found for session: ${session.sessionId}. Skipping.`);
        continue;
      }
      const originalSl = originalSlItem.price;

      // Rebuild queues using the newly corrected logic and pip size
      const newSlQueue = activeSignalManager.buildAdaptiveSlQueue(
        session.direction,
        session.entryPrice,
        originalSl
      );

      const newTpQueue = activeSignalManager.buildTpQueue(session.originalTpList);

      console.log(`Migrating session ${session.sessionId} (${session.channel}):`);
      console.log(`  - Old SL Queue:`, session.slQueue.map(s => `${s.name}: ${s.price}`).join(', '));
      console.log(`  - New SL Queue:`, newSlQueue.map(s => `${s.name}: ${s.price}`).join(', '));
      console.log(`  - Old TP Queue:`, session.tpQueue.map(t => `L${t.level}: ${t.price} (${t.isFullTp ? 'FULL' : 'NON-FULL'})`).join(', '));
      console.log(`  - New TP Queue:`, newTpQueue.map(t => `L${t.level}: ${t.price} (${t.isFullTp ? 'FULL' : 'NON-FULL'})`).join(', '));

      await MonitoringSession.updateOne(
        { _id: session._id },
        {
          $set: {
            slQueue: newSlQueue,
            tpQueue: newTpQueue,
            isDirty: true,
          },
        }
      );

      migratedCount++;
    }

    console.log(`Successfully migrated ${migratedCount} active sessions.`);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
