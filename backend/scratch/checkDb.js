const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const ChannelAnalytics = require('../src/models/channelAnalytics.model');
const MonitoringSession = require('../src/models/monitoringSession.model');

const run = async () => {
  try {
    console.log('Connecting to', envConfig.mongodbUri);
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');
    
    const channels = await ChannelAnalytics.find({}).lean();
    console.log('--- CHANNEL ANALYTICS ---');
    console.log(JSON.stringify(channels, null, 2));

    const sessions = await MonitoringSession.find({}).lean();
    console.log('--- MONITORING SESSIONS ---');
    console.log(JSON.stringify(sessions, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
