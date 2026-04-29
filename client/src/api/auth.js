import api from './axios';

const authAPI = {
  login: async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    // Server returns { success, data: { user, accessToken } }
    return data.data;
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    // Server returns { success, data: { user, accessToken, refreshToken } }
    return data.data;
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  // Server route: POST /auth/refresh-token  (NOT /auth/refresh)
  refreshToken: async (refreshToken) => {
    const { data } = await api.post('/auth/refresh-token', { refreshToken });
    return data.data;
  },

  getProfile: async () => {
    const { data } = await api.get('/auth/me');
    // Server returns { success, data: { id, firstName, ... } }
    return data.data;
  },

  // Server route: PUT /auth/me  (NOT /auth/profile)
  updateProfile: async (profileData) => {
    const { data } = await api.put('/auth/me', profileData);
    return data.data;
  },

  // Server route: POST /auth/change-password  (NOT PUT)
  changePassword: async (passwordData) => {
    const { data } = await api.post('/auth/change-password', passwordData);
    return data;
  },

  // Server route: POST /auth/verify-email/:token  (NOT GET)
  verifyEmail: async (token) => {
    const { data } = await api.post(`/auth/verify-email/${token}`);
    return data;
  },

  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token, password) => {
    const { data } = await api.post(`/auth/reset-password/${token}`, { password });
    return data;
  },
};

export default authAPI;