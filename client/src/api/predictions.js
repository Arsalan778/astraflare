import api from './axios';

const predictionsAPI = {
  getPrediction: async (params) => {
    const { data } = await api.post('/predictions', params);
    return data.data;
  },

  getPredictionById: async (id) => {
    const { data } = await api.get(`/predictions/${id}`);
    return data.data;
  },

  getPredictionHistory: async (params = {}) => {
    const { data } = await api.get('/predictions/history', { params });
    return data.data || data;
  },

  getRegionRisk: async (regionId) => {
    const { data } = await api.get(`/map/region/${regionId}`);
    return data.data;
  },

  getHeatmapData: async (params = {}) => {
    const { data } = await api.get('/map/heatmap', { params });
    return data.data;
  },

  getRiskZones: async (params = {}) => {
    const { data } = await api.get('/map/risk-zones', { params });
    return data.data;
  },

  getFireSpread: async (predictionId, params = {}) => {
    const { data } = await api.get(`/predictions/${predictionId}/fire-spread`, { params });
    return data.data;
  },

  getEvacuationRoutes: async (params) => {
    const { data } = await api.post('/predictions/evacuation-routes', params);
    return data.data;
  },

  getModelExplanation: async (predictionId) => {
    const { data } = await api.get(`/predictions/${predictionId}/explanation`);
    return data.data;
  },

  getFeatureImportance: async () => {
    const { data } = await api.get('/predictions/feature-importance');
    return data.data;
  },

  getRiskTrends: async (params = {}) => {
    const { data } = await api.get('/predictions/risk-trends', { params });
    return data.data;
  },

  getEmissionsEstimate: async (predictionId) => {
    const { data } = await api.get(`/predictions/${predictionId}/emissions`);
    return data.data;
  },

  batchPredict: async (regions) => {
    const { data } = await api.post('/predictions/batch', { regions });
    return data.data;
  },

  getRegions: async (params = {}) => {
    const { data } = await api.get('/predictions/regions', { params });
    return data.data;
  },

  getHistoricalTrends: async (regionId, params = {}) => {
    const { data } = await api.get(`/predictions/region/${regionId}/historical`, { params });
    return data.data;
  },

  searchRegions: async (searchTerm, params = {}) => {
    const { data } = await api.get('/map/regions', {
      params: { search: searchTerm, ...params },
    });
    return data.data;
  },

  getStats: async (params = {}) => {
    const { data } = await api.get('/predictions/stats/summary', { params });
    return data.data;
  },
};

export default predictionsAPI;

export const { searchRegions } = predictionsAPI;