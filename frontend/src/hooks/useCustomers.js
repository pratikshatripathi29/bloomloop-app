import { useState, useEffect, useCallback } from 'react';
import customersApi from '../services/customersApi';

/**
 * Custom hook to manage customer data, pagination, and filters
 */
export function useCustomers({ search = '', city = '', page = 1, limit = 10 } = {}) {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customersApi.getCustomers({ search, city, page, limit });
      setCustomers(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 0);
    } catch (err) {
      setError(err?.message || 'Failed to fetch customers');
      setCustomers([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [search, city, page, limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customerData) => {
    const newCustomer = await customersApi.createCustomer(customerData);
    await fetchCustomers();
    return newCustomer;
  };

  const removeCustomer = async (id) => {
    await customersApi.deleteCustomer(id);
    await fetchCustomers();
  };

  return {
    customers,
    total,
    totalPages,
    page,
    limit,
    loading,
    error,
    refetch: fetchCustomers,
    addCustomer,
    removeCustomer,
  };
}

export default useCustomers;
