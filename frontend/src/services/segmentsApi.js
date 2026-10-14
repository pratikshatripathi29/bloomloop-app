import apiClient from './apiClient';

/**
 * Segments API Service
 * Encapsulates all HTTP calls to /segments endpoints
 */
export const segmentsApi = {
  /**
   * Fetch all customer segments with live customer count
   */
  async getSegments() {
    const response = await apiClient.get('/segments');
    return response.data;
  },

  /**
   * Fetch a single segment by ID
   */
  async getSegmentById(id) {
    const response = await apiClient.get(`/segments/${id}`);
    return response.data;
  },

  /**
   * Create a new segment
   */
  async createSegment(segmentData) {
    const response = await apiClient.post('/segments', segmentData);
    return response.data;
  },

  /**
   * Update an existing segment
   */
  async updateSegment(id, updateData) {
    const response = await apiClient.put(`/segments/${id}`, updateData);
    return response.data;
  },

  /**
   * Delete a segment
   */
  async deleteSegment(id) {
    const response = await apiClient.delete(`/segments/${id}`);
    return response.data;
  },

  /**
   * Preview matching customer count for an existing saved segment
   */
  async getSegmentPreview(id) {
    const response = await apiClient.get(`/segments/${id}/preview`);
    return response.data;
  },

  /**
   * Preview live matching count for arbitrary uncommitted filters
   */
  async previewFilters(filters) {
    const response = await apiClient.post('/segments/preview', { filters });
    return response.data;
  },
};

export default segmentsApi;
