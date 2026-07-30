import { useState, useEffect, useCallback } from 'react';
import { getHealth } from '../services/health.service';

export const useHealth = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getHealth();
      setHealthData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return { healthData, loading, error, refetch: fetchHealth };
};
