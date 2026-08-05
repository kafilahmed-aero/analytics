const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const MonitoringSession = require('../src/models/monitoringSession.model');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    
    // We will search for:
    // 1. Channel name containing 'art', 'trade' or matching any pattern
    // 2. Message key containing both '12' and '21'
    // 3. Any session where the raw ID or other fields might match
    const sessions = await MonitoringSession.find({}).lean();
    console.log(`Total sessions in DB: ${sessions.length}`);

    const matches = [];
    for (const session of sessions) {
      const channel = String(session.channel || '').toUpperCase();
      const messageKey = String(session.messageKey || '').toUpperCase();
      const signalId = String(session.signalId || '').toUpperCase();
      const createdAt = session.createdAt ? new Date(session.createdAt) : null;
      
      let isMatch = false;
      let matchReason = '';

      // Check for 'art' or 'trade' in channel name (excluding common ones like TRADEWITHZEEN, PFOREXPLATOT if they don't contain 'art')
      if (channel.includes('ART')) {
        isMatch = true;
        matchReason += 'Channel contains ART. ';
      }

      // Check if messageKey contains '12' and '21'
      if (messageKey.includes('12') && messageKey.includes('21')) {
        isMatch = true;
        matchReason += `messageKey has both 12 and 21: ${messageKey}. `;
      }
      
      // Check if messageKey contains '1221'
      if (messageKey.includes('1221')) {
        isMatch = true;
        matchReason += `messageKey contains 1221. `;
      }

      // Check if time is around 12:21
      if (createdAt) {
        const hours = createdAt.getUTCHours() + 5.5; // conversion example (adjusting for UTC vs local)
        const mins = createdAt.getUTCMinutes();
        // check if hour is 12 and minute is 21 (or near it)
        const localHours = new Date(createdAt.getTime() + (5.5 * 60 * 60 * 1000)).getHours();
        const localMins = new Date(createdAt.getTime() + (5.5 * 60 * 60 * 1000)).getMinutes();
        if (localHours === 12 && localMins === 21) {
          isMatch = true;
          matchReason += `Created exactly around 12:21 local time: ${createdAt.toISOString()}. `;
        }
      }

      if (isMatch) {
        matches.push({
          session,
          matchReason
        });
      }
    }

    console.log(`Found ${matches.length} matches:`);
    matches.forEach(m => {
      console.log('----------------------------------------------------');
      console.log(`Reason: ${m.matchReason}`);
      console.log(JSON.stringify(m.session, null, 2));
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
