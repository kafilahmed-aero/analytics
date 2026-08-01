/**
 * Utility for processing Channel Analytics datasets for the Dashboard API.
 * Applies case-insensitive search and sorting by totalSignalsProcessed.
 */

const processChannelQuery = (dataset = [], query = {}) => {
  let result = Array.isArray(dataset) ? [...dataset] : [];

  // 1. Search Filter (case-insensitive substring match on channel identifier)
  if (query.search && typeof query.search === 'string') {
    const term = query.search.trim().toUpperCase();
    if (term) {
      result = result.filter((item) =>
        item.channel && item.channel.toUpperCase().includes(term)
      );
    }
  }

  // 2. Sorting by totalSignalsProcessed DESC
  result.sort((a, b) => (b.totalSignalsProcessed || 0) - (a.totalSignalsProcessed || 0));

  return {
    channels: result,
  };
};

module.exports = processChannelQuery;
