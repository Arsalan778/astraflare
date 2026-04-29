// client/src/components/Charts/FeatureImportance.jsx
import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import {
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

const FEATURE_ICONS = {
  temperature: '🌡️',
  humidity: '💧',
  wind_speed: '💨',
  precipitation: '🌧️',
  vegetation_index: '🌿',
  soil_moisture: '🏜️',
  elevation: '⛰️',
  slope: '📐',
  days_since_rain: '☀️',
  fuel_moisture: '🪵',
  drought_index: '🔥',
  solar_radiation: '☀️',
  population_density: '🏘️',
  distance_to_road: '🛣️',
  land_cover_type: '🗺️',
  historical_fire_freq: '📊',
  lightning_density: '⚡',
  aspect: '🧭',
  canopy_height: '🌲',
  relative_greenness: '🍃',
};

const FEATURE_DESCRIPTIONS = {
  temperature: 'Current ambient temperature is a primary driver of fire ignition and spread rate.',
  humidity: 'Relative humidity affects fuel moisture content and fire behavior.',
  wind_speed: 'Wind accelerates fire spread and influences fire direction and intensity.',
  precipitation: 'Recent rainfall directly impacts fuel moisture and fire potential.',
  vegetation_index: 'NDVI indicates vegetation density — fuel load available for burning.',
  soil_moisture: 'Dry soil allows vegetation to desiccate more rapidly.',
  elevation: 'Altitude affects temperature, moisture, and fire behavior.',
  slope: 'Steep terrain accelerates fire spread rate uphill.',
  days_since_rain: 'Extended dry periods increase fuel dryness and fire susceptibility.',
  fuel_moisture: 'Direct measure of available fuel moisture content.',
  drought_index: 'Composite drought severity indicator.',
  solar_radiation: 'Incoming solar energy affecting fuel temperature and drying.',
  population_density: 'Human activity proximity — both ignition risk and impact factor.',
  distance_to_road: 'Accessibility affects response time and ignition probability.',
  land_cover_type: 'Vegetation type determines fuel characteristics.',
  historical_fire_freq: 'Historical fire occurrence frequency in the region.',
  lightning_density: 'Lightning strike frequency — natural ignition source.',
  aspect: 'Slope direction affects sun exposure and fuel moisture.',
  canopy_height: 'Forest canopy height affects fire behavior type.',
  relative_greenness: 'Current greenness relative to historical range.',
};

const getImportanceColor = (value) => {
  if (value >= 0.15) return '#ef4444';
  if (value >= 0.1) return '#f97316';
  if (value >= 0.06) return '#f59e0b';
  if (value >= 0.03) return '#22c55e';
  return '#6b7280';
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const icon = FEATURE_ICONS[data.featureKey] || '📊';
  const description = FEATURE_DESCRIPTIONS[data.featureKey] || 'Feature contribution to prediction.';

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h4 className="text-white font-semibold text-sm">{data.name}</h4>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Importance</span>
          <span className="text-white font-bold">
            {(data.importance * 100).toFixed(1)}%
          </span>
        </div>
        {data.shapValue !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">SHAP Value</span>
            <span
              className={`font-bold text-sm ${
                data.shapValue >= 0 ? 'text-red-400' : 'text-blue-400'
              }`}
            >
              {data.shapValue >= 0 ? '+' : ''}
              {data.shapValue.toFixed(4)}
            </span>
          </div>
        )}
        {data.currentValue !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs">Current Value</span>
            <span className="text-gray-200 font-medium text-sm">
              {data.currentValue} {data.unit || ''}
            </span>
          </div>
        )}
        <p className="text-gray-500 text-xs mt-1 border-t border-gray-700 pt-2">{description}</p>
      </div>
    </div>
  );
};

const FeatureImportance = ({
  data = [],
  title = 'Feature Importance',
  subtitle = 'SHAP-based feature contribution analysis',
  maxFeatures = 15,
  showValues = true,
  showShap = true,
  layout = 'horizontal', // 'horizontal' | 'vertical'
  height = 450,
  loading = false,
  modelName = '',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('importance'); // 'importance' | 'name' | 'shap'
  const [selectedFeature, setSelectedFeature] = useState(null);

  const chartData = useMemo(() => {
    const features =
      data.length > 0
        ? data
        : [
            { name: 'Temperature', featureKey: 'temperature', importance: 0.182, shapValue: 0.045, currentValue: 38, unit: '°C' },
            { name: 'Wind Speed', featureKey: 'wind_speed', importance: 0.156, shapValue: 0.038, currentValue: 25, unit: 'km/h' },
            { name: 'Humidity', featureKey: 'humidity', importance: 0.134, shapValue: -0.032, currentValue: 22, unit: '%' },
            { name: 'Vegetation Index', featureKey: 'vegetation_index', importance: 0.118, shapValue: 0.028, currentValue: 0.65, unit: 'NDVI' },
            { name: 'Days Since Rain', featureKey: 'days_since_rain', importance: 0.098, shapValue: 0.024, currentValue: 14, unit: 'days' },
            { name: 'Fuel Moisture', featureKey: 'fuel_moisture', importance: 0.087, shapValue: -0.021, currentValue: 8, unit: '%' },
            { name: 'Drought Index', featureKey: 'drought_index', importance: 0.072, shapValue: 0.018, currentValue: 3.2, unit: '' },
            { name: 'Slope', featureKey: 'slope', importance: 0.056, shapValue: 0.014, currentValue: 15, unit: '°' },
            { name: 'Elevation', featureKey: 'elevation', importance: 0.038, shapValue: -0.009, currentValue: 450, unit: 'm' },
            { name: 'Soil Moisture', featureKey: 'soil_moisture', importance: 0.028, shapValue: -0.007, currentValue: 12, unit: '%' },
            { name: 'Solar Radiation', featureKey: 'solar_radiation', importance: 0.022, shapValue: 0.005, currentValue: 850, unit: 'W/m²' },
            { name: 'Lightning Density', featureKey: 'lightning_density', importance: 0.015, shapValue: 0.004, currentValue: 0.3, unit: '/km²' },
            { name: 'Canopy Height', featureKey: 'canopy_height', importance: 0.012, shapValue: 0.003, currentValue: 18, unit: 'm' },
            { name: 'Distance to Road', featureKey: 'distance_to_road', importance: 0.008, shapValue: -0.002, currentValue: 2.5, unit: 'km' },
            { name: 'Population Density', featureKey: 'population_density', importance: 0.005, shapValue: 0.001, currentValue: 12, unit: '/km²' },
          ];

    let sorted = [...features];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'shap') {
      sorted.sort((a, b) => Math.abs(b.shapValue || 0) - Math.abs(a.shapValue || 0));
    } else {
      sorted.sort((a, b) => b.importance - a.importance);
    }

    const limit = expanded ? sorted.length : maxFeatures;
    return sorted.slice(0, limit);
  }, [data, sortBy, expanded, maxFeatures]);

  const cumulativeImportance = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.importance, 0);
  }, [chartData]);

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-64 mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 bg-gray-700 rounded w-24" />
                <div
                  className="h-6 bg-gray-700/50 rounded"
                  style={{ width: `${80 - i * 8}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-purple-400" />
              {title}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">
              {subtitle}
              {modelName && <span className="text-purple-400"> — {modelName}</span>}
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
            {[
              { key: 'importance', label: 'Impact' },
              { key: 'shap', label: 'SHAP' },
              { key: 'name', label: 'A-Z' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  sortBy === opt.key
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cumulative Bar */}
        <div className="mt-4 bg-gray-900/40 rounded-lg p-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-gray-400 text-xs">
              Top {chartData.length} features explain
            </span>
            <span className="text-white font-bold text-sm">
              {(cumulativeImportance * 100).toFixed(1)}% of variance
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-orange-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${cumulativeImportance * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 pb-2">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 'auto']}
              stroke="#6b7280"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              axisLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              stroke="#6b7280"
              tick={{ fontSize: 12, fill: '#d1d5db' }}
              axisLine={{ stroke: '#4b5563' }}
              tickFormatter={(name) => {
                const featureKey = chartData.find((d) => d.name === name)?.featureKey;
                const icon = FEATURE_ICONS[featureKey] || '';
                return `${icon} ${name}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
            <Bar
              dataKey="importance"
              radius={[0, 6, 6, 0]}
              onClick={(data) => setSelectedFeature(data.featureKey)}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getImportanceColor(entry.importance)}
                  fillOpacity={selectedFeature === entry.featureKey ? 1 : 0.8}
                  stroke={selectedFeature === entry.featureKey ? '#fff' : 'none'}
                  strokeWidth={selectedFeature === entry.featureKey ? 2 : 0}
                />
              ))}
              {showValues && (
                <LabelList
                  dataKey="importance"
                  position="right"
                  formatter={(v) => `${(v * 100).toFixed(1)}%`}
                  style={{ fill: '#d1d5db', fontSize: 11, fontWeight: 600 }}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SHAP Waterfall mini section */}
      {showShap && selectedFeature && (
        <div className="mx-6 mb-4 bg-gray-900/40 rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-3">
            <InformationCircleIcon className="w-4 h-4 text-blue-400" />
            <h4 className="text-white text-sm font-medium">
              {FEATURE_ICONS[selectedFeature]}{' '}
              {chartData.find((d) => d.featureKey === selectedFeature)?.name} — SHAP Detail
            </h4>
          </div>
          {(() => {
            const feature = chartData.find((d) => d.featureKey === selectedFeature);
            if (!feature) return null;
            const shapVal = feature.shapValue || 0;
            const positive = shapVal >= 0;
            return (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-500 text-xs">SHAP Value</p>
                  <p className={`text-lg font-bold ${positive ? 'text-red-400' : 'text-blue-400'}`}>
                    {positive ? '+' : ''}{shapVal.toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Direction</p>
                  <p className={`text-sm font-medium ${positive ? 'text-red-400' : 'text-blue-400'}`}>
                    {positive ? '↑ Increases Risk' : '↓ Decreases Risk'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Current</p>
                  <p className="text-lg font-bold text-gray-200">
                    {feature.currentValue} {feature.unit}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Expand/Collapse */}
      {data.length > maxFeatures && (
        <div className="px-6 pb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm"
          >
            {expanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4" /> Show less
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" /> Show all {data.length} features
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default FeatureImportance;