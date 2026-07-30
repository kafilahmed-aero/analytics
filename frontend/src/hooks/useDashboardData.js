import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDashboardSummary,
  getDashboardChannels,
} from '../services/dashboard.service';

export const useDashboardData = () => {
  // Query State (Search channel name)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data & Status State
  const [summary, setSummary] = useState(null);
  const [channels, setChannels] = useState([]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // 400ms Debounce Handler for Channel Search Term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
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
          search: debouncedSearch,
        };

        // Parallel Fetch: Summary + Channel Analytics
        const [summaryRes, channelsRes] = await Promise.all([
          getDashboardSummary(),
          getDashboardChannels(queryParams),
        ]);

        if (summaryRes.success) {
          setSummary(summaryRes.data);
        }

        if (channelsRes.success && channelsRes.data) {
          setChannels(channelsRes.data.channels || []);
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
    [debouncedSearch]
  );

  // Fetch when debounced search term changes
  useEffect(() => {
    fetchData(isInitialLoading);
  }, [debouncedSearch]);

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

  return {
    searchTerm,
    setSearchTerm,
    summary,
    channels,
    isInitialLoading,
    isRefreshing,
    error,
    refreshData: () => fetchData(false),
  };
};
