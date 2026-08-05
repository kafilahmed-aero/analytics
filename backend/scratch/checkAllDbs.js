const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');

const run = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    const admin = mongoose.connection.db.admin();
    const dbsList = await admin.listDatabases();
    console.log('Databases in cluster:');
    
    for (const dbInfo of dbsList.databases) {
      console.log(` - Database: ${dbInfo.name}`);
      
      // Connect to this specific database
      const dbConnection = mongoose.connection.useDb(dbInfo.name);
      const collections = await dbConnection.db.listCollections().toArray();
      
      for (const coll of collections) {
        const count = await dbConnection.collection(coll.name).countDocuments();
        console.log(`     * Collection: ${coll.name} (documents: ${count})`);
        
        if (coll.name === 'channelanalytics') {
          const sample = await dbConnection.collection(coll.name).find({}).toArray();
          if (sample.length > 0) {
            console.log(`       Sample channels:`, sample.map(s => s.channel || s.identifier).join(', '));
          }
        }
      }
    }

  } catch (err) {
    console.error('Error listing databases:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
