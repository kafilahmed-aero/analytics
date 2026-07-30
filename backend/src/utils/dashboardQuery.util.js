/**
 * Utility for processing Channel Analytics datasets for the Dashboard API.
 * Applies case-insensitive search and automatic sorting by totalSignals DESC.
 * Pagination has been completely removed to display all channels in a single response.
 */

const processChannelQuery = (dataset = [], query = {}) => {
  let result = Array.isArray(dataset) ? [...dataset] : [];

  // 1. Search Filter (case-insensitive substring match on channel identifier)
  if (query.search && typeof query.search === 'string') {
    const term = query.search.trim().toUpperCase();
    if (term) {
      result = result.filter((item) =>
        item.identifier && item.identifier.toUpperCase().includes(term)
      );
    }
  }

  // 2. Automatic Ranking / Sorting: Total Signals DESC (Highest active first)
  result.sort((a, b) => (b.totalSignals || 0) - (a.totalSignals || 0));

  // 3. Return simplified response format without pagination metadata
  return {
    channels: result,
  };
};

module.exports = processChannelQuery;
