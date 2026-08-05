const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    const sessions = await MonitoringSession.find({}).lean();
    console.log('--- ALL MONITORED SESSIONS ---');
    console.log(`Total: ${sessions.length}`);
    sessions.forEach((s, idx) => {
      console.log(`[#${idx+1}] ID: ${s.signalId} | Channel: ${s.channel} | Key: ${s.messageKey} | Dir: ${s.direction} | Entry: ${s.entryPrice} | Status: ${s.status} | CreatedAt: ${s.createdAt}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
