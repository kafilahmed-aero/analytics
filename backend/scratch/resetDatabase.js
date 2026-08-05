const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');

const run = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    const collections = ['monitoringsessions', 'channelanalytics', 'pairanalytics', 'syncState'];

    for (const collName of collections) {
      console.log(`Clearing collection "${collName}"...`);
      const result = await mongoose.connection.collection(collName).deleteMany({});
      console.log(`Cleared "${collName}": deleted ${result.deletedCount} documents.`);
    }

    console.log('Database reset completed successfully.');
  } catch (err) {
    console.error('Reset error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
