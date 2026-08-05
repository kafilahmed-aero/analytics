const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');

const run = async () => {
  try {
    await mongoose.connect(envConfig.mongodbUri);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:');
    collections.forEach((c) => console.log(` - ${c.name}`));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
