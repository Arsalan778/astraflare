import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import predictionsAPI from '@api/predictions';

export const fetchHeatmapData = createAsyncThunk(
  'map/fetchHeatmap',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getHeatmapData(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch heatmap');
    }
  }
);

export const fetchRiskZones = createAsyncThunk(
  'map/fetchRiskZones',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getRiskZones(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch risk zones');
    }
  }
);

export const fetchFireSpread = createAsyncThunk(
  'map/fetchFireSpread',
  async ({ predictionId, params }, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getFireSpread(predictionId, params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch fire spread');
    }
  }
);

export const fetchEvacuationRoutes = createAsyncThunk(
  'map/fetchEvacuationRoutes',
  async (params, { rejectWithValue }) => {
    try {
      const data = await predictionsAPI.getEvacuationRoutes(params);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch evacuation routes');
    }
  }
);

const initialState = {
  viewState: {
    longitude: -119.4179,
    latitude: 36.7783,
    zoom: 6,
    pitch: 0,
    bearing: 0,
  },
  heatmapData: [],
  riskZones: [],
  fireSpreadData: null,
  evacuationRoutes: [],
  activeFirePoints: { type: 'FeatureCollection', features: [] },
  selectedRegion: null,
  selectedPoint: null,
  mapStyle: 'dark',
  activeLayers: {
    heatmap: true,
    riskZones: true,
    fireSpread: false,
    evacuation: false,
    activeFires: true,
  },
  timeSlider: {
    currentTime: 0,
    maxTime: 72,
    isPlaying: false,
  },
  isLoading: {
    heatmap: false,
    riskZones: false,
    fireSpread: false,
    evacuation: false,
    activeFires: false,
  },
  error: null,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setViewState(state, action) {
      state.viewState = { ...state.viewState, ...action.payload };
    },
    setSelectedRegion(state, action) {
      state.selectedRegion = action.payload;
    },
    toggleLayer(state, action) {
      const layer = action.payload;
      state.activeLayers[layer] = !state.activeLayers[layer];
    },
    setLayerVisibility(state, action) {
      const { layer, visible } = action.payload;
      state.activeLayers[layer] = visible;
    },
    setTimeSlider(state, action) {
      state.timeSlider = { ...state.timeSlider, ...action.payload };
    },
    incrementTime(state) {
      if (state.timeSlider.currentTime < state.timeSlider.maxTime) {
        state.timeSlider.currentTime += 1;
      } else {
        state.timeSlider.isPlaying = false;
        state.timeSlider.currentTime = 0;
      }
    },
    resetMap(state) {
      return { ...initialState, viewState: state.viewState };
    },
    setMapStyle(state, action) {
      state.mapStyle = action.payload;
    },
    resetViewport(state) {
      state.viewState = initialState.viewState;
    },
    setTimeRange(state, action) {
      state.timeSlider = { ...state.timeSlider, ...action.payload };
    },
    setViewport(state, action) {
      state.viewState = { ...state.viewState, ...action.payload };
    },
    setSelectedPoint(state, action) {
      state.selectedPoint = action.payload;
    },
    addRiskZone(state, action) {
      if (!Array.isArray(state.riskZones)) {
        state.riskZones = [];
      }
      state.riskZones = [...state.riskZones, action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      // Heatmap
      .addCase(fetchHeatmapData.pending, (state) => {
        state.isLoading.heatmap = true;
      })
      .addCase(fetchHeatmapData.fulfilled, (state, action) => {
        state.isLoading.heatmap = false;
        state.heatmapData = action.payload?.data || action.payload || [];
      })
      .addCase(fetchHeatmapData.rejected, (state, action) => {
        state.isLoading.heatmap = false;
        state.error = action.payload;
      })

      // Risk Zones
      .addCase(fetchRiskZones.pending, (state) => {
        state.isLoading.riskZones = true;
      })
      .addCase(fetchRiskZones.fulfilled, (state, action) => {
        state.isLoading.riskZones = false;
        const data = action.payload?.data || action.payload;
        state.riskZones = Array.isArray(data) ? data : [];
      })
      .addCase(fetchRiskZones.rejected, (state, action) => {
        state.isLoading.riskZones = false;
        state.error = action.payload;
      })

      // Fire Spread
      .addCase(fetchFireSpread.pending, (state) => {
        state.isLoading.fireSpread = true;
      })
      .addCase(fetchFireSpread.fulfilled, (state, action) => {
        state.isLoading.fireSpread = false;
        state.fireSpreadData = action.payload;
      })
      .addCase(fetchFireSpread.rejected, (state, action) => {
        state.isLoading.fireSpread = false;
        state.error = action.payload;
      })

      // Evacuation
      .addCase(fetchEvacuationRoutes.pending, (state) => {
        state.isLoading.evacuation = true;
      })
      .addCase(fetchEvacuationRoutes.fulfilled, (state, action) => {
        state.isLoading.evacuation = false;
        state.evacuationRoutes = action.payload?.routes || action.payload || [];
      })
      .addCase(fetchEvacuationRoutes.rejected, (state, action) => {
        state.isLoading.evacuation = false;
        state.error = action.payload;
      });
  },
});

export const {
  setViewState,
  setSelectedRegion,
  toggleLayer,
  setLayerVisibility,
  setTimeSlider,
  incrementTime,
  resetMap,
  setMapStyle,
  resetViewport,
  setTimeRange,
  setViewport,
  setSelectedPoint,
  addRiskZone,
} = mapSlice.actions;

export const fetchMapData = (params) => async (dispatch) => {
  dispatch(fetchHeatmapData(params));
  dispatch(fetchRiskZones(params));
  // In a real app, you might also fetch active fires here
};

export default mapSlice.reducer;
