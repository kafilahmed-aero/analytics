const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');

const run = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    const admin = mongoose.connection.db.admin();
    const dbsList = await admin.listDatabases();
    
    for (const dbInfo of dbsList.databases) {
      if (['admin', 'local'].includes(dbInfo.name)) continue;
      
      const dbConnection = mongoose.connection.useDb(dbInfo.name);
      const collections = await dbConnection.db.listCollections().toArray();
      
      for (const coll of collections) {
        // Search by _id or signalId or messageId or key
        const doc = await dbConnection.collection(coll.name).findOne({
          $or: [
            { _id: new mongoose.Types.ObjectId("6a72e72a0d6280e5abc85af7") },
            { _id: "6a72e72a0d6280e5abc85af7" },
            { signalId: "6a72e72a0d6280e5abc85af7" },
            { id: "6a72e72a0d6280e5abc85af7" },
            { messageId: 10960 },
            { messageKey: /10960/ },
            { channel: /Trade.*Saqi/i }
          ]
        });

        if (doc) {
          console.log(`FOUND in db: "${dbInfo.name}", collection: "${coll.name}":`);
          console.log(JSON.stringify(doc, null, 2));
        }
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
