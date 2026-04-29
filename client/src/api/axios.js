import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get store lazily (breaks circular dependency)
let _store = null;

export const injectStore = (store) => {
  _store = store;
};

// Request interceptor — attach access token
api.interceptors.request.use(
  (config) => {
    if (_store) {
      const state = _store.getState();
      const token = state.auth.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 & token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        if (_store) {
          const { logout } = await import('@store/authSlice');
          _store.dispatch(logout());
        }
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // The refreshToken is stored as an httpOnly cookie.
        // Since withCredentials=true, it is sent automatically — no need to read from Redux.
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true });

        const { accessToken } = data.data;

        const { setTokens } = await import('@store/authSlice');
        _store.dispatch(setTokens({ accessToken }));

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        const { logout } = await import('@store/authSlice');
        _store.dispatch(logout());
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    }

    if (error.response?.status === 429) {
      toast.error('Too many requests. Please slow down.');
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    if (!error.response) {
      toast.error('Network error. Check your internet connection.');
    }

    return Promise.reject(error);
  }
);

export default api;