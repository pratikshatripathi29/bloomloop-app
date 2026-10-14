import apiClient from './apiClient';

/**
 * AI Service for BloomLoop CRM.
 * Calls Groq-powered backend endpoints for:
 * 1. Generating campaign message drafts
 * 2. Suggesting audience segment filters
 * 3. Answering natural-language business analytics questions
 */
export const aiApi = {
  /**
   * Generate 3 campaign message drafts given a goal and tone.
   * @param {{ goal: string, tone: string, channel?: string }} params
   */
  generateCampaignMessages: async ({ goal, tone, channel = 'email' }) => {
    const response = await apiClient.post('/ai/campaign-message', {
      goal,
      tone,
      channel,
    });
    return response.data;
  },

  /**
   * Suggest segment filters from natural language description.
   * @param {{ description: string }} params
   */
  suggestSegmentFilters: async ({ description }) => {
    const response = await apiClient.post('/ai/segment-suggestion', {
      description,
    });
    return response.data;
  },

  /**
   * Ask business analytics question.
   * Backend converts into a safe spec, executes backend-built SQL, and returns chart/scalar results.
   * @param {{ question: string }} params
   */
  askAnalytics: async ({ question }) => {
    const response = await apiClient.post('/analytics/ask', {
      question,
    });
    return response.data;
  },
};

export default aiApi;
