const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const sessionRegistry = require('../src/services/activeSignalManager.service');

const run = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    // Define the canonical signal with the raw fields from Trade With Saqi
    // Note: since our normalization logic is updated, passing it through processRawSignal
    // will calculate the correct queues and save the session.
    const rawSignal = {
      _id: "6a72e72a0d6280e5abc85af7",
      id: "6a72e72a0d6280e5abc85af7",
      pair: "XAUUSD",
      direction: "BUY",
      action: "BUY",
      entryPrice: 4161,
      entry: 4161,
      entryRange: [4157, 4161],
      targets: [4164, 4167, 4170, 4174, 4178, 4182],
      originalSl: 4150,
      sl: 4150,
      stopLoss: 4150,
      channel: "TRADEWITHSAQI1",
      messageId: "10960",
      createdAt: "2026-08-05T07:31:56.000Z",
      status: "ACTIVE",
      fixedLotSize: 0.01
    };

    // We normalize it manually to see if it works
    const { normalizeSignal } = require('../src/services/signalNormalizer.service');
    const canonical = normalizeSignal(rawSignal);
    console.log('Canonical Normalized Signal:', canonical);

    console.log('Processing and saving session to MongoDB Atlas...');
    const result = sessionRegistry.processRawSignal(canonical);
    console.log('Result:', result);

    console.log('Flushing session to database...');
    const sessionPersistence = require('../src/services/sessionPersistence.service');
    const flushRes = await sessionPersistence.flush();
    console.log('Flush result:', flushRes);

    // Wait a brief moment to allow mongoose to finish saving to database
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Ingested successfully.');

  } catch (err) {
    console.error('Ingestion error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
