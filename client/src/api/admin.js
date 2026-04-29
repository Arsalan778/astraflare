import api from './axios';

const adminAPI = {
  // ── Users ────────────────────────────────────────────────────────
  getUsers: async (params = {}) => {
    const { data } = await api.get('/admin/users', { params });
    return data;
  },

  getUserById: async (userId) => {
    const { data } = await api.get(`/admin/users/${userId}`);
    return data;
  },

  // Server has PATCH /admin/users/:id/role — not a generic PUT
  updateUserRole: async (userId, role) => {
    const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
    return data;
  },

  toggleUserActive: async (userId) => {
    const { data } = await api.patch(`/admin/users/${userId}/toggle-active`);
    return data;
  },

  // ── Datasets ─────────────────────────────────────────────────────
  getDatasets: async (params = {}) => {
    const { data } = await api.get('/admin/datasets', { params });
    return data;
  },

  // Dataset upload goes to /data/upload (not /admin/datasets/upload)
  uploadDataset: async (formData, onProgress) => {
    const { data } = await api.post('/data/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percent);
        }
      },
    });
    return data;
  },

  deleteDataset: async (datasetId) => {
    const { data } = await api.delete(`/admin/datasets/${datasetId}`);
    return data;
  },

  // ── ML Models ─────────────────────────────────────────────────────
  getModels: async () => {
    const { data } = await api.get('/admin/models');
    return data;
  },

  // Server has POST /admin/models/retrain (not /admin/models/:id/retrain)
  retrainModel: async (config = {}) => {
    const { data } = await api.post('/admin/models/retrain', config);
    return data;
  },

  // ── System ────────────────────────────────────────────────────────
  // Server route: GET /admin/system/status (not /admin/system/health or /admin/system/metrics)
  getSystemStatus: async () => {
    const { data } = await api.get('/admin/system/status');
    return data;
  },

  // Kept as aliases for backwards compat with any components that call these
  getSystemHealth: async () => {
    const { data } = await api.get('/admin/system/status');
    return data;
  },

  getSystemMetrics: async () => {
    const { data } = await api.get('/admin/system/status');
    return data;
  },

  // ── Audit ─────────────────────────────────────────────────────────
  getAuditLogs: async (params = {}) => {
    const { data } = await api.get('/admin/audit-logs', { params });
    return data;
  },

  // ── Thresholds ────────────────────────────────────────────────────
  getThresholds: async () => {
    const { data } = await api.get('/admin/thresholds');
    return data;
  },

  updateThresholds: async (thresholds) => {
    const { data } = await api.put('/admin/thresholds', thresholds);
    return data;
  },

  // ── Dashboard ─────────────────────────────────────────────────────
  getDashboardStats: async () => {
    const { data } = await api.get('/admin/dashboard/stats');
    return data;
  },

  // ── Reports (via /reports routes) ────────────────────────────────
  getReports: async (params = {}) => {
    const { data } = await api.get('/reports', { params });
    return data;
  },

  getReportHistory: async (params = {}) => {
    // Backend uses GET /reports for listing/history
    const { data } = await api.get('/reports', { params });
    return data;
  },

  getReportTemplates: async () => {
    // Fallback if template endpoint is missing, return empty array
    try {
      const { data } = await api.get('/reports/templates');
      return data;
    } catch (err) {
      console.warn('Report templates not available, using empty list');
      return { success: true, data: [] };
    }
  },

  // Server route: POST /reports (not /reports/generate)
  generateReport: async (config) => {
    const { data } = await api.post('/reports', config);
    return data;
  },

  downloadReport: async (reportId) => {
    const { data } = await api.get(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  getReportStats: async () => {
    const { data } = await api.get('/reports/stats/summary');
    return data;
  },

  // ── Alerts (via /alerts routes) ──────────────────────────────────
  getAlerts: async (params = {}) => {
    const { data } = await api.get('/alerts', { params });
    return data;
  },

  createAlert: async (alertData) => {
    const { data } = await api.post('/alerts', alertData);
    return data;
  },

  // Server uses PATCH /alerts/:id/resolve (not PUT)
  resolveAlert: async (alertId) => {
    const { data } = await api.patch(`/alerts/${alertId}/resolve`);
    return data;
  },
};

export { adminAPI };

export const {
  generateReport,
  getReportStats,
  getDashboardStats,
  getReportHistory,
  getReportTemplates,
} = adminAPI;

export default adminAPI;
