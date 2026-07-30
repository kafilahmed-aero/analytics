/**
 * Generic reusable utility for processing dataset arrays (Channels or Pairs).
 * Applies validation, search, minSignals filtering, sorting, and pagination.
 */

const ALLOWED_SORT_FIELDS = new Set([
  'identifier',
  'totalSignals',
  'tp1Hits',
  'tp2Hits',
  'tp3Hits',
  'fullTpHits',
  'originalSlHits',
  'sl8Hits',
  'sl10Hits',
  'sl12Hits',
  'lastUpdated',
]);

const processDashboardQuery = (dataset = [], query = {}) => {
  let result = Array.isArray(dataset) ? [...dataset] : [];

  // 1. Search Filter (case-insensitive on identifier)
  if (query.search && typeof query.search === 'string') {
    const term = query.search.trim().toUpperCase();
    if (term) {
      result = result.filter((item) =>
        item.identifier && item.identifier.toUpperCase().includes(term)
      );
    }
  }

  // 2. Minimum Signals Filter
  if (query.minSignals !== undefined) {
    const min = parseInt(query.minSignals, 10);
    if (!isNaN(min) && min >= 0) {
      result = result.filter((item) => item.totalSignals >= min);
    }
  }

  // 3. Sorting with Safe Defaults
  let sortBy = String(query.sortBy || 'totalSignals').trim();
  if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
    sortBy = 'totalSignals';
  }

  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const isAsc = sortOrder === 'asc';

  result.sort((a, b) => {
    const valA = a[sortBy] ?? 0;
    const valB = b[sortBy] ?? 0;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    const numA = Number(valA) || 0;
    const numB = Number(valB) || 0;
    return isAsc ? numA - numB : numB - numA;
  });

  // 4. Pagination with Safe Defaults
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) {
    limit = 10;
  } else if (limit > 100) {
    limit = 100;
  }

  const totalItems = result.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  
  if (page > totalPages) {
    page = totalPages;
  }

  const startIndex = (page - 1) * limit;
  const paginatedItems = result.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

module.exports = processDashboardQuery;
