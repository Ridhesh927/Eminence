export const getToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    if (document.cookie) {
      const match = document.cookie.match(/(?:^|;\s*)(?:accessToken|token)=([^;]*)/);
      if (match) return decodeURIComponent(match[1]);
    }
    const stored = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (stored) return stored;
  } catch (_e) {}
  return null;
};

export const setToken = (token) => {
  if (typeof window !== 'undefined' && token) {
    try {
      localStorage.setItem('token', token);
    } catch (_e) {}
  }
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
    } catch (_e) {}
  }
};
