import apiClient from './apiClient';

/**
 * Service to fetch CRM dashboard metrics and analytics.
 */
export const dashboardApi = {
  getMetrics: async () => {
    const response = await apiClient.get('/dashboard');
    return response.data;
  },
};

export default dashboardApi;
