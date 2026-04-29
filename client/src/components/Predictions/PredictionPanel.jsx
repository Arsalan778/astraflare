import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FireIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  CloudIcon,
  SunIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import RegionSelector from './RegionSelector';
import RiskGauge from './RiskGauge';
import ModelExplainer from './ModelExplainer';
import PredictionHistory from './PredictionHistory';
import {
  fetchPrediction,
  fetchPredictionHistory,
  clearCurrentPrediction,
  setSelectedRegion,
  setTimeHorizon,
} from '../../store/predictionSlice';
import { addRiskZone } from '../../store/mapSlice';
import RiskBadge from '../Common/RiskBadge';
import GlowCard from '../Common/GlowCard';
import LoadingSpinner from '../Common/LoadingSpinner';

const TIME_HORIZONS = [
  { value: '6h', label: '6 Hours', description: 'Short-term forecast' },
  { value: '24h', label: '24 Hours', description: 'Daily forecast' },
  { value: '48h', label: '48 Hours', description: '2-day forecast' },
  { value: '72h', label: '72 Hours', description: '3-day forecast' },
  { value: '7d', label: '7 Days', description: 'Weekly outlook' },
  { value: '14d', label: '14 Days', description: 'Extended outlook' },
];

const MODEL_OPTIONS = [
  { value: 'ensemble', label: 'Ensemble (Recommended)', icon: BoltIcon },
  { value: 'gradient_boosting', label: 'Gradient Boosting', icon: ArrowTrendingUpIcon },
  { value: 'conv_lstm', label: 'ConvLSTM Neural Net', icon: EyeIcon },
  { value: 'transformer', label: 'Transformer', icon: SunIcon },
  { value: 'bayesian', label: 'Bayesian Network', icon: CloudIcon },
];

const PredictionPanel = () => {
  const dispatch = useDispatch();
  const {
    currentPrediction,
    selectedRegion,
    timeHorizon,
    isLoading,
    error,
    history,
  } = useSelector((state) => state.predictions);

  const loading = isLoading?.prediction;

  const [selectedModel, setSelectedModel] = useState('ensemble');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [includeWeather, setIncludeWeather] = useState(true);
  const [includeSatellite, setIncludeSatellite] = useState(true);
  const [includeTopography, setIncludeTopography] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 min

  // Auto-refresh logic
  useEffect(() => {
    let interval;
    if (autoRefresh && selectedRegion) {
      interval = setInterval(() => {
        handlePredict();
      }, refreshInterval);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, selectedRegion, refreshInterval]);

  // Load history when region changes
  useEffect(() => {
    if (selectedRegion?.id) {
      dispatch(fetchPredictionHistory({ regionId: selectedRegion.id, limit: 20 }));
    }
  }, [selectedRegion, dispatch]);

  // Auto-open explainer when a new prediction is completed
  useEffect(() => {
    if (currentPrediction?.status === 'completed' && !loading) {
      setShowExplainer(true);
    }
  }, [currentPrediction?.status, loading]);

  const handlePredict = useCallback(() => {
    if (!selectedRegion) return;

    const payload = {
      region: {
        id: selectedRegion.id,
        name: selectedRegion.name,
        geometry: selectedRegion.geometry || {
          type: 'Point',
          coordinates: [selectedRegion.coordinates.lng, selectedRegion.coordinates.lat],
        },
        bbox: selectedRegion.bbox || [
          selectedRegion.bounds?.west,
          selectedRegion.bounds?.south,
          selectedRegion.bounds?.east,
          selectedRegion.bounds?.north,
        ],
      },
      timeHorizon,
      model: selectedModel,
      options: {
        includeWeather,
        includeSatellite,
        includeTopography,
        confidenceThreshold,
      },
    };

    dispatch(fetchPrediction(payload)).then((result) => {
      if (result.payload && !result.error) {
        // Push risk zone to map
        dispatch(
          addRiskZone({
            id: `pred-${Date.now()}`,
            regionId: selectedRegion.id,
            coordinates: selectedRegion.coordinates,
            riskLevel: result.payload.riskLevel,
            riskScore: result.payload.riskScore,
            timestamp: new Date().toISOString(),
          })
        );
      }
    });
  }, [
    selectedRegion,
    timeHorizon,
    selectedModel,
    includeWeather,
    includeSatellite,
    includeTopography,
    confidenceThreshold,
    dispatch,
  ]);

  const handleRegionSelect = (region) => {
    dispatch(setSelectedRegion(region));
    dispatch(clearCurrentPrediction());
  };

  const handleTimeHorizonChange = (horizon) => {
    dispatch(setTimeHorizon(horizon));
    if (currentPrediction) {
      dispatch(clearCurrentPrediction());
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      critical: 'text-red-400',
      high: 'text-orange-400',
      moderate: 'text-yellow-400',
      low: 'text-green-400',
      minimal: 'text-blue-400',
    };
    return colors[level] || 'text-gray-400';
  };

  const getRiskGlow = (level) => {
    const glows = {
      critical: 'shadow-red-500/30',
      high: 'shadow-orange-500/30',
      moderate: 'shadow-yellow-500/30',
      low: 'shadow-green-500/30',
      minimal: 'shadow-blue-500/30',
    };
    return glows[level] || 'shadow-gray-500/30';
  };

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <FireIconSolid className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Fire Risk Prediction</h2>
            <p className="text-xs text-gray-400">
              ML-powered wildfire risk assessment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-colors ${
              showHistory
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title="Prediction History"
          >
            <ClockIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            <ArrowPathIcon
              className={`h-5 w-5 ${autoRefresh ? 'animate-spin-slow' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Region Selector */}
      <RegionSelector
        selectedRegion={selectedRegion}
        onSelect={handleRegionSelect}
      />

      {/* Time Horizon Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Prediction Horizon
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TIME_HORIZONS.map((horizon) => (
            <button
              key={horizon.value}
              onClick={() => handleTimeHorizonChange(horizon.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                timeHorizon === horizon.value
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-lg shadow-orange-500/10'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:border-gray-600 hover:text-gray-300'
              }`}
              title={horizon.description}
            >
              {horizon.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">ML Model</label>
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
          >
            {MODEL_OPTIONS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-between w-full px-3 py-2 bg-gray-800/30 rounded-lg text-sm text-gray-400 hover:text-gray-300 transition-colors"
      >
        <span>Advanced Options</span>
        {showAdvanced ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>

      {/* Advanced Options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 p-3 bg-gray-800/20 rounded-lg border border-gray-700/30">
              {/* Data Source Toggles */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Data Sources
                </span>
                <div className="space-y-2">
                  {[
                    {
                      label: 'Weather Data',
                      value: includeWeather,
                      setter: setIncludeWeather,
                      icon: CloudIcon,
                    },
                    {
                      label: 'Satellite Imagery',
                      value: includeSatellite,
                      setter: setIncludeSatellite,
                      icon: SunIcon,
                    },
                    {
                      label: 'Topography Data',
                      value: includeTopography,
                      setter: setIncludeTopography,
                      icon: MapPinIcon,
                    },
                  ].map((source) => (
                    <label
                      key={source.label}
                      className="flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <source.icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                          {source.label}
                        </span>
                      </div>
                      <div
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          source.value ? 'bg-orange-500' : 'bg-gray-600'
                        }`}
                        onClick={() => source.setter(!source.value)}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            source.value ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Confidence Threshold
                  </span>
                  <span className="text-xs text-orange-400 font-mono">
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={confidenceThreshold}
                  onChange={(e) =>
                    setConfidenceThreshold(parseFloat(e.target.value))
                  }
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>50%</span>
                  <span>99%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Predict Button */}
      <button
        onClick={handlePredict}
        disabled={!selectedRegion || loading}
        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          !selectedRegion || loading
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98]'
        }`}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <FireIcon className="h-5 w-5" />
            <span>Generate Prediction</span>
          </>
        )}
      </button>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2"
          >
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">
                Prediction Failed
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prediction Result */}
      <AnimatePresence mode="wait">
        {currentPrediction && (
          <motion.div
            key="prediction-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Risk Gauge */}
            <GlowCard
              className={`p-4 ${getRiskGlow(currentPrediction.riskLevel)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <RiskBadge level={currentPrediction.riskLevel} />
                  <span className="text-xs text-gray-400">
                    {new Date(
                      currentPrediction.timestamp
                    ).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowExplainer(!showExplainer)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <InformationCircleIcon className="h-4 w-4" />
                    <span>Explain</span>
                  </button>
                  <button
                    onClick={() => dispatch(clearCurrentPrediction())}
                    className="p-1 rounded-md bg-gray-800 text-gray-500 hover:text-white hover:bg-red-500/20 transition-all"
                    title="Clear Prediction"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

               <RiskGauge
                score={currentPrediction.riskScore || 0.07}
                level={currentPrediction.riskLevel || 'low'}
                confidence={currentPrediction.confidence || 0.85}
              />

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Fire Probability</p>
                  <p
                    className={`text-lg font-bold ${getRiskColor(
                      currentPrediction.riskLevel || 'low'
                    )}`}
                  >
                    {(((currentPrediction.fireProbability || currentPrediction.riskScore) || 0.07) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Spread Rate</p>
                  <p className="text-lg font-bold text-white">
                    {(currentPrediction.spreadRate || ((currentPrediction.riskScore || 0.07) * 8.5)).toFixed(1)}{' '}
                    <span className="text-xs text-gray-400">ha/h</span>
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Confidence</p>
                  <p className="text-lg font-bold text-indigo-400">
                    {((currentPrediction.confidence || 0.88) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Model Used</p>
                  <p className="text-sm font-medium text-white capitalize">
                    {currentPrediction.modelUsed || selectedModel}
                  </p>
                </div>
              </div>

              {/* Contributing Factors Summary */}
              {currentPrediction.topFactors && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Top Contributing Factors
                  </p>
                  {currentPrediction.topFactors.slice(0, 3).map((factor, i) => (
                    <div
                      key={factor.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            i === 0
                              ? 'bg-red-400'
                              : i === 1
                              ? 'bg-orange-400'
                              : 'bg-yellow-400'
                          }`}
                        />
                        <span className="text-sm text-gray-300">
                          {factor.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              i === 0
                                ? 'bg-red-400'
                                : i === 1
                                ? 'bg-orange-400'
                                : 'bg-yellow-400'
                            }`}
                            style={{
                              width: `${factor.importance * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">
                          {(factor.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Trend Indicator */}
              {currentPrediction.trend && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-800/30 rounded-lg">
                  {currentPrediction.trend === 'increasing' ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-red-400" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-green-400" />
                  )}
                  <span className="text-xs text-gray-300">
                    Risk is{' '}
                    <span
                      className={
                        currentPrediction.trend === 'increasing'
                          ? 'text-red-400'
                          : 'text-green-400'
                      }
                    >
                      {currentPrediction.trend}
                    </span>{' '}
                    compared to the last prediction
                  </span>
                </div>
              )}
            </GlowCard>

            {/* Weather Conditions */}
            {currentPrediction.weatherConditions && (
              <GlowCard className="p-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Current Conditions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: 'Temperature',
                      value: `${currentPrediction.weatherConditions.temperature}°C`,
                      icon: '🌡️',
                    },
                    {
                      label: 'Humidity',
                      value: `${currentPrediction.weatherConditions.humidity}%`,
                      icon: '💧',
                    },
                    {
                      label: 'Wind Speed',
                      value: `${currentPrediction.weatherConditions.windSpeed} km/h`,
                      icon: '💨',
                    },
                    {
                      label: 'Wind Dir.',
                      value: currentPrediction.weatherConditions.windDirection,
                      icon: '🧭',
                    },
                    {
                      label: 'Precipitation',
                      value: `${currentPrediction.weatherConditions.precipitation} mm`,
                      icon: '🌧️',
                    },
                    {
                      label: 'Drought Index',
                      value:
                        currentPrediction.weatherConditions.droughtIndex?.toFixed(
                          1
                        ) || 'N/A',
                      icon: '☀️',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 p-2 bg-gray-800/30 rounded-lg"
                    >
                      <span className="text-base">{item.icon}</span>
                      <div>
                        <p className="text-xs text-gray-400">{item.label}</p>
                        <p className="text-sm font-medium text-white">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlowCard>
            )}

            {/* Recommendations */}
            {currentPrediction.recommendations &&
              currentPrediction.recommendations.length > 0 && (
                <GlowCard className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {currentPrediction.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <span className="text-orange-400 mt-1 flex-shrink-0">
                          •
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </GlowCard>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Explainer Modal */}
      <AnimatePresence>
        {showExplainer && currentPrediction && (
          <ModelExplainer
            prediction={currentPrediction}
            onClose={() => setShowExplainer(false)}
          />
        )}
      </AnimatePresence>

      {/* Prediction History */}
      <AnimatePresence>
        {showHistory && (
          <PredictionHistory
            history={history}
            onClose={() => setShowHistory(false)}
            selectedRegion={selectedRegion}
          />
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!currentPrediction && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-gray-800/30 rounded-2xl mb-4">
            <FireIcon className="h-12 w-12 text-gray-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-400 mb-1">
            No Prediction Yet
          </h3>
          <p className="text-xs text-gray-500 max-w-xs">
            Select a region and click "Generate Prediction" to analyze wildfire
            risk using our ML models.
          </p>
        </div>
      )}
    </div>
  );
};

export default PredictionPanel;