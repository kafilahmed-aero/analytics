const EventEmitter = require('events');

class AnalyticsEventEmitter extends EventEmitter {}

const analyticsEvents = new AnalyticsEventEmitter();

module.exports = analyticsEvents;
