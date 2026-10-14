import apiClient from './apiClient';

/**
 * Customers API Service
 * Encapsulates all HTTP calls to /customers endpoints
 */
export const customersApi = {
  /**
   * Fetch paginated list of customers with optional search and city filters
   */
  async getCustomers({ search = '', city = '', page = 1, limit = 10 } = {}) {
    const params = { page, limit };
    if (search && search.trim()) params.search = search.trim();
    if (city && city.trim()) params.city = city.trim();

    const response = await apiClient.get('/customers', { params });
    return response.data;
  },

  /**
   * Fetch a single customer by ID
   */
  async getCustomerById(id) {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create a new customer record
   */
  async createCustomer(customerData) {
    const response = await apiClient.post('/customers', customerData);
    return response.data;
  },

  /**
   * Update an existing customer record
   */
  async updateCustomer(id, updateData) {
    const response = await apiClient.put(`/customers/${id}`, updateData);
    return response.data;
  },

  /**
   * Delete a customer record by ID
   */
  async deleteCustomer(id) {
    const response = await apiClient.delete(`/customers/${id}`);
    return response.data;
  },
};

export default customersApi;
