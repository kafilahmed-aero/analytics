const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');
const ChannelAnalytics = require('../src/models/channelAnalytics.model');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    
    const sessionChannels = await MonitoringSession.distinct('channel');
    console.log('Unique channels in MonitoringSession:', sessionChannels);

    const analyticsChannels = await ChannelAnalytics.distinct('channel');
    console.log('Unique channels in ChannelAnalytics:', analyticsChannels);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
