import axios from 'axios';

/**
 * Global Axios API Client
 * Configured with backend base URL and automatic Clerk JWT Bearer token attachment.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach Clerk JWT Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      if (typeof window !== 'undefined' && window.Clerk?.session) {
        const token = await window.Clerk.session.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (err) {
      console.warn('Unable to retrieve Clerk session token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Centralize error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data;
    const customError = {
      message:
        errorData?.error?.message ||
        errorData?.detail?.message ||
        errorData?.detail ||
        error.message ||
        'An unexpected server error occurred',
      code: errorData?.error?.code || 'ERROR',
      status: error.response?.status,
      data: errorData,
    };
    return Promise.reject(customError);
  }
);

export default apiClient;
