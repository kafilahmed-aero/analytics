const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    
    // Find all sessions where channel name matches 'the art of trading' (case-insensitive)
    // or messageKey / signalId contains '1221' or '12_21'
    const query = {
      $or: [
        { channel: { $regex: /the art of trading/i } },
        { channel: { $regex: /art.*trade/i } },
        { messageKey: { $regex: /1221/ } },
        { messageKey: { $regex: /12_21/ } },
        { signalId: { $regex: /1221/ } }
      ]
    };

    const sessions = await MonitoringSession.find(query).lean();
    console.log(`Found ${sessions.length} matching sessions:`);
    console.log(JSON.stringify(sessions, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
