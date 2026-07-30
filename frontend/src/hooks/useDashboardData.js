import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDashboardSummary,
  getDashboardChannels,
  getDashboardPairs,
} from '../services/dashboard.service';

export const useDashboardData = () => {
  const [activeTab, setActiveTab] = useState('channels'); // 'channels' | 'pairs'

  // Query Params State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('totalSignals');
  const [sortOrder, setSortOrder] = useState('desc');
  const [minSignals, setMinSignals] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Data & Status State
  const [summary, setSummary] = useState(null);
  const [tableItems, setTableItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // 400ms Debounce Handler for Search Term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Main Fetch Data Function
  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const queryParams = {
          page,
          limit,
          search: debouncedSearch,
          sortBy,
          sortOrder,
          minSignals,
        };

        // Parallel Fetch: Summary + Active Tab Data
        const [summaryRes, tableRes] = await Promise.all([
          getDashboardSummary(),
          activeTab === 'channels'
            ? getDashboardChannels(queryParams)
            : getDashboardPairs(queryParams),
        ]);

        if (summaryRes.success) {
          setSummary(summaryRes.data);
        }

        if (tableRes.success && tableRes.data) {
          setTableItems(tableRes.data.items || []);
          if (tableRes.data.pagination) {
            setPagination(tableRes.data.pagination);
          }
        }

        setError(null);
      } catch (err) {
        console.error('Dashboard Fetch Error:', err.message);
        // Non-blocking error: Retain existing data on refresh error
        setError(err.message || 'Failed to refresh dashboard data');
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, page, limit, debouncedSearch, sortBy, sortOrder, minSignals]
  );

  // Fetch when tab or query params change
  useEffect(() => {
    fetchData(isInitialLoading);
  }, [activeTab, page, limit, debouncedSearch, sortBy, sortOrder, minSignals]);

  // 10-Second Automatic Non-Blocking Polling Refresh
  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataRef.current(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setPage(1);
    }
  };

  return {
    activeTab,
    setActiveTab: handleTabChange,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    minSignals,
    setMinSignals,
    page,
    setPage,
    limit,
    setLimit,
    summary,
    tableItems,
    pagination,
    isInitialLoading,
    isRefreshing,
    error,
    refreshData: () => fetchData(false),
  };
};
