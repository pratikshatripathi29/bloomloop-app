import apiClient from './apiClient';

/**
 * Service to manage CRM campaigns.
 */
export const campaignsApi = {
  getCampaigns: async () => {
    const response = await apiClient.get('/campaigns');
    return response.data;
  },

  getCampaignStats: async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}/stats`);
    return response.data;
  },

  createCampaign: async (data) => {
    const response = await apiClient.post('/campaigns', data);
    return response.data;
  },

  deleteCampaign: async (campaignId) => {
    const response = await apiClient.delete(`/campaigns/${campaignId}`);
    return response.data;
  },
};

export default campaignsApi;
