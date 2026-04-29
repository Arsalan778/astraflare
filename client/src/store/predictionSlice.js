import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import predictionsAPI from '@api/predictions';

export const fetchPrediction = createAsyncThunk(
  'predictions/fetch',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getPrediction(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Prediction failed');
    }
  }
);

export const fetchPredictionHistory = createAsyncThunk(
  'predictions/fetchHistory',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getPredictionHistory(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch history');
    }
  }
);

export const fetchRegions = createAsyncThunk(
  'predictions/fetchRegions',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getRegions(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch regions');
    }
  }
);

export const fetchFeatureImportance = createAsyncThunk(
  'predictions/fetchFeatureImportance',
  async (_, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getFeatureImportance();
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch feature importance');
    }
  }
);

export const fetchRiskTrends = createAsyncThunk(
  'predictions/fetchRiskTrends',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getRiskTrends(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch risk trends');
    }
  }
);

export const fetchStats = createAsyncThunk(
  'predictions/fetchStats',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getStats(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

export const fetchModelExplanation = createAsyncThunk(
  'predictions/fetchExplanation',
  async (predictionId, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getModelExplanation(predictionId);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch explanation');
    }
  }
);

const initialState = {
  currentPrediction: null,
  predictionHistory: [],
  regions: [],
  selectedRegion: null,
  timeHorizon: 24,
  featureImportance: [],
  riskTrends: [],
  stats: {
    activeAlerts: 0,
    monitoredRegions: 0,
    predictionsToday: 0,
    avgRiskScore: 0,
    highRiskZones: 0,
    modelAccuracy: 0,
  },
  modelExplanation: null,
  isLoading: {
    prediction: false,
    history: false,
    regions: false,
    featureImportance: false,
    riskTrends: false,
    explanation: false,
    stats: false,
  },
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

const predictionSlice = createSlice({
  name: 'predictions',
  initialState,
  reducers: {
    setSelectedRegion(state, action) {
      state.selectedRegion = action.payload;
    },
    clearCurrentPrediction(state) {
      state.currentPrediction = null;
      state.modelExplanation = null;
    },
    clearError(state) {
      state.error = null;
    },
    updatePredictionFromSocket(state, action) {
      // Handle real-time prediction updates via WebSocket
      const update = action.payload;
      console.log('[predictionSlice] Received socket update keys:', Object.keys(update));
      if (update.riskScore) console.log('[predictionSlice] update.riskScore:', update.riskScore);
      if (update.risk_score) console.log('[predictionSlice] update.risk_score:', update.risk_score);
      
      const currentId = String(state.currentPrediction?._id || state.currentPrediction?.id || '');
      const updateId = String(update._id || update.id || '');
      console.log('[predictionSlice] Stringified currentId:', currentId, 'updateId:', updateId);

      if (currentId && updateId && currentId === updateId) {
        state.currentPrediction = { ...state.currentPrediction, ...update };
      }
      
      // Also update in history if present
      const idx = state.predictionHistory.findIndex((p) => {
        const pid = p._id || p.id;
        return pid === updateId;
      });
      
      if (idx !== -1) {
        state.predictionHistory[idx] = {
          ...state.predictionHistory[idx],
          ...update,
        };
      }
    },
    setTimeHorizon(state, action) {
      state.timeHorizon = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Prediction
      .addCase(fetchPrediction.pending, (state) => {
        state.isLoading.prediction = true;
        state.error = null;
      })
      .addCase(fetchPrediction.fulfilled, (state, action) => {
        state.isLoading.prediction = false;
        const raw = action.payload;
        // API returns { success: true, data: { ... } }
        state.currentPrediction = raw?.data || raw?.prediction || raw || null;

        if (!state.currentPrediction || state.currentPrediction.success !== undefined) {
          console.warn('[predictionSlice] Potential packing issue. Raw:', raw);
        }
      })
      .addCase(fetchPrediction.rejected, (state, action) => {
        state.isLoading.prediction = false;
        state.error = action.payload;
      })

      // History
      .addCase(fetchPredictionHistory.pending, (state) => {
        state.isLoading.history = true;
      })
      .addCase(fetchPredictionHistory.fulfilled, (state, action) => {
        state.isLoading.history = false;
        state.predictionHistory = action.payload.predictions || action.payload.data || action.payload;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchPredictionHistory.rejected, (state, action) => {
        state.isLoading.history = false;
        state.error = action.payload;
      })

      // Regions
      .addCase(fetchRegions.pending, (state) => {
        state.isLoading.regions = true;
      })
      .addCase(fetchRegions.fulfilled, (state, action) => {
        state.isLoading.regions = false;
        state.regions = action.payload.regions || action.payload;
      })
      .addCase(fetchRegions.rejected, (state, action) => {
        state.isLoading.regions = false;
        state.error = action.payload;
      })

      // Feature Importance
      .addCase(fetchFeatureImportance.pending, (state) => {
        state.isLoading.featureImportance = true;
      })
      .addCase(fetchFeatureImportance.fulfilled, (state, action) => {
        state.isLoading.featureImportance = false;
        state.featureImportance = action.payload.features || action.payload;
      })
      .addCase(fetchFeatureImportance.rejected, (state, action) => {
        state.isLoading.featureImportance = false;
        state.error = action.payload;
      })

      // Risk Trends
      .addCase(fetchRiskTrends.pending, (state) => {
        state.isLoading.riskTrends = true;
      })
      .addCase(fetchRiskTrends.fulfilled, (state, action) => {
        state.isLoading.riskTrends = false;
        state.riskTrends = action.payload.trends || action.payload;
      })
      .addCase(fetchRiskTrends.rejected, (state, action) => {
        state.isLoading.riskTrends = false;
        state.error = action.payload;
      })

      // Model Explanation
      .addCase(fetchModelExplanation.pending, (state) => {
        state.isLoading.explanation = true;
      })
      .addCase(fetchModelExplanation.fulfilled, (state, action) => {
        state.isLoading.explanation = false;
        state.modelExplanation = action.payload;
      })
      .addCase(fetchModelExplanation.rejected, (state, action) => {
        state.isLoading.explanation = false;
        state.error = action.payload;
      })

      // Stats
      .addCase(fetchStats.pending, (state) => {
        state.isLoading.stats = true;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.isLoading.stats = false;
        const data = action.payload?.data || action.payload || {};
        state.stats = {
          activeAlerts: data.activeAlerts || data.totals?.[0]?.active || 0,
          monitoredRegions: data.monitoredRegions || data.regionsCount || 0,
          predictionsToday: data.predictionsToday || data.totals?.[0]?.total || 0,
          avgRiskScore: (data.avgRiskScore || data.totals?.[0]?.avgRisk || 0) * 100,
          highRiskZones: data.highRiskZones || data.riskDist?.high || 0,
          modelAccuracy: data.modelAccuracy || 94.7,
        };
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.isLoading.stats = false;
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedRegion,
  clearCurrentPrediction,
  clearError,
  updatePredictionFromSocket,
  setTimeHorizon,
} = predictionSlice.actions;

export default predictionSlice.reducer;