import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Interceptor to ensure x-xsrf-token is sent across local ports (5173 -> 3000)
api.interceptors.request.use((config) => {
  if (typeof document !== 'undefined' && document.cookie) {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    if (match) {
      config.headers['x-xsrf-token'] = decodeURIComponent(match[1]);
    }
  }
  return config;
});

export default api;
