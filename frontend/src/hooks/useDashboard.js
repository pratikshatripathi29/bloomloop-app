import { useEffect, useState, useCallback } from 'react';
import dashboardApi from '../services/dashboardApi';

/**
 * Custom hook to fetch and refresh CRM dashboard metrics.
 * Follows the page -> hook -> API service pattern.
 */
export default function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardApi.getMetrics();
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError(
        err?.message ||
        'Unable to load dashboard metrics. Please check server connectivity.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    loading,
    error,
    refetch: fetchMetrics,
  };
}
