const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    const activeStatuses = ['CREATED', 'VALIDATED', 'REGISTERED', 'HYDRATED', 'WAITING_PRICE', 'MONITORING'];
    const sessions = await MonitoringSession.find({ status: { $in: activeStatuses } }).lean();
    console.log(`Checking ${sessions.length} active sessions:`);
    for (const s of sessions) {
      console.log(`Session: ${s.sessionId} | Channel: ${s.channel} | Entry: ${s.entryPrice}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
