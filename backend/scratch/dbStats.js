const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:');
    for (const coll of collections) {
      const count = await mongoose.connection.db.collection(coll.name).countDocuments();
      console.log(` - ${coll.name}: ${count} documents`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
