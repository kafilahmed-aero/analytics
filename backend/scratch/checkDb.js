const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected to MongoDB.');

    const session = await MonitoringSession.findOne({ channel: /TRADEWITHSAQI/i }).lean();
    console.log('Session document in DB:');
    console.log(JSON.stringify(session, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
