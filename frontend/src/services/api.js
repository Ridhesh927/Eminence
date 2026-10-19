import axios from 'axios';
import { getToken, removeToken } from './tokenService';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
if (!configuredApiUrl && !import.meta.env.DEV) {
  throw new Error('VITE_API_URL is required outside development builds.');
}
const apiBaseUrl = configuredApiUrl || 'http://localhost:3000';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Interceptor to attach Authorization Bearer token & ensure x-xsrf-token is sent
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof document !== 'undefined' && document.cookie) {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    if (match) {
      config.headers['x-xsrf-token'] = decodeURIComponent(match[1]);
    }
  }
  return config;
});

// Response interceptor to clean up expired/invalid tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof error.response?.data?.message === 'string' && error.response.data.message.toLowerCase().includes('token')) {
      removeToken();
    }
    return Promise.reject(error);
  }
);

export default api;
