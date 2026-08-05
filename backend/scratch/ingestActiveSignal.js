const mongoose = require('mongoose');
const envConfig = require('../src/config/env.config');
const sessionRegistry = require('../src/services/activeSignalManager.service');
const { normalizeSignal } = require('../src/services/signalNormalizer.service');
const sessionPersistence = require('../src/services/sessionPersistence.service');
const fxDeskProService = require('../src/services/fxdeskpro.service');

const run = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(envConfig.mongodbUri);
    console.log('Connected.');

    console.log(`Fetching active signals using FxDeskProService (BaseURL: ${fxDeskProService.baseUrl})...`);
    const response = await fxDeskProService.fetchActiveSignals();
    const payload = response.data || response || {};
    const rawSignals = payload.signals || payload.data || (Array.isArray(payload) ? payload : []);

    console.log(`Fetched ${rawSignals.length} raw signals.`);

    for (const rawSignal of rawSignals) {
      console.log(`\nProcessing signal for channel: "${rawSignal.channelTitle || rawSignal.channel}"`);
      const canonical = normalizeSignal(rawSignal);
      console.log(`Canonical Channel: "${canonical.channel}"`);
      
      const result = sessionRegistry.processRawSignal(canonical);
      console.log('Registration Result:', result.success ? 'SUCCESS' : 'FAILED');
    }

    console.log('\nFlushing sessions to MongoDB Atlas...');
    const flushRes = await sessionPersistence.flush();
    console.log('Flush result:', flushRes);

    console.log('Ingestion completed successfully.');

  } catch (err) {
    console.error('Ingestion error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

run();
