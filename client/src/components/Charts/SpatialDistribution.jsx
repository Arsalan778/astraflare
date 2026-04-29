// client/src/components/Charts/SpatialDistribution.jsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from 'recharts';
import {
  MapPinIcon,
  GlobeAltIcon,
  ViewfinderCircleIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

const RISK_COLORS = {
  extreme: { color: '#ef4444', bg: '#ef444420', min: 75 },
  high: { color: '#f97316', bg: '#f9731620', min: 50 },
  moderate: { color: '#f59e0b', bg: '#f59e0b20', min: 25 },
  low: { color: '#22c55e', bg: '#22c55e20', min: 0 },
};

const getRiskLevel = (value) => {
  if (value >= 75) return 'extreme';
  if (value >= 50) return 'high';
  if (value >= 25) return 'moderate';
  return 'low';
};

const getRiskColor = (value) => {
  return RISK_COLORS[getRiskLevel(value)].color;
};

const VIEW_MODES = [
  { key: 'scatter', label: 'Scatter', icon: ViewfinderCircleIcon },
  { key: 'radar', label: 'Radar', icon: GlobeAltIcon },
  { key: 'treemap', label: 'Treemap', icon: Squares2X2Icon },
];

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const riskLevel = getRiskLevel(data.riskScore);

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <MapPinIcon className="w-4 h-4" style={{ color: getRiskColor(data.riskScore) }} />
        <h4 className="text-white font-semibold text-sm">{data.name || 'Unknown Region'}</h4>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-gray-400 text-xs">Coordinates</span>
          <span className="text-gray-200 text-xs">
            {data.lat?.toFixed(4)}, {data.lng?.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-xs">Risk Score</span>
          <span
            className="font-bold text-sm"
            style={{ color: getRiskColor(data.riskScore) }}
          >
            {data.riskScore?.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-xs">Risk Level</span>
          <span
            className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
            style={{
              color: RISK_COLORS[riskLevel].color,
              backgroundColor: RISK_COLORS[riskLevel].bg,
            }}
          >
            {riskLevel}
          </span>
        </div>
        {data.fireCount !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400 text-xs">Active Fires</span>
            <span className="text-orange-400 font-medium text-xs">{data.fireCount}</span>
          </div>
        )}
        {data.area !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400 text-xs">Coverage</span>
            <span className="text-gray-200 text-xs">
              {data.area >= 1000 ? `${(data.area / 1000).toFixed(1)}k` : data.area} acres
            </span>
          </div>
        )}
        {data.vegetation !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-400 text-xs">Vegetation</span>
            <span className="text-green-400 text-xs">{data.vegetation}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomTreemapContent = ({ x, y, width, height, name, riskScore, depth, index }) => {
  if (width < 30 || height < 30) return null;

  const color = getRiskColor(riskScore || 0);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.5}
      />
      {width > 60 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#e5e7eb"
            fontSize={Math.min(14, width / 8)}
            fontWeight={600}
          >
            {name?.length > 15 ? `${name.substring(0, 12)}...` : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill={color}
            fontSize={Math.min(18, width / 6)}
            fontWeight={700}
          >
            {riskScore?.toFixed(0)}%
          </text>
        </>
      )}
    </g>
  );
};

const SpatialDistribution = ({
  data = [],
  radarData = [],
  title = 'Spatial Risk Distribution',
  subtitle = 'Geographic distribution of wildfire risk',
  height = 480,
  loading = false,
  onRegionSelect,
  selectedRegion = null,
}) => {
  const [viewMode, setViewMode] = useState('scatter');
  const [filterRisk, setFilterRisk] = useState('all'); // 'all' | 'extreme' | 'high' | 'moderate' | 'low'
  const [selectedPoint, setSelectedPoint] = useState(null);

  const scatterData = useMemo(() => {
    if (data.length > 0) return data;

    const regions = [
      'Sierra Nevada', 'Cascade Range', 'Rocky Mountains', 'Appalachian',
      'Ozarks', 'Great Plains', 'Pacific Coast', 'Southwest Desert',
      'Northern Rockies', 'Central Valley', 'Klamath Basin', 'Blue Mountains',
      'Bitterroot Range', 'Yellowstone', 'Grand Canyon', 'Black Hills',
      'Olympic Peninsula', 'Boundary Waters', 'Everglades', 'Shenandoah',
      'Big Bend', 'Glacier Peak', 'Lassen', 'Sequoia', 'Yosemite',
      'Death Valley', 'Joshua Tree', 'Zion', 'Bryce Canyon', 'Arches',
    ];

    const vegetationTypes = ['Coniferous Forest', 'Mixed Forest', 'Grassland', 'Chaparral', 'Shrubland', 'Desert Scrub'];

    return regions.map((name, i) => {
      const lat = 32 + Math.random() * 16;
      const lng = -122 + Math.random() * 30;
      const riskScore = parseFloat((Math.random() * 100).toFixed(1));
      const fireCount = Math.floor(Math.random() * 15);
      const area = Math.floor(Math.random() * 5000 + 100);

      return {
        name,
        lat: parseFloat(lat.toFixed(4)),
        lng: parseFloat(lng.toFixed(4)),
        riskScore,
        fireCount,
        area,
        vegetation: vegetationTypes[Math.floor(Math.random() * vegetationTypes.length)],
        population: Math.floor(Math.random() * 50000 + 1000),
      };
    });
  }, [data]);

  const filteredScatterData = useMemo(() => {
    if (filterRisk === 'all') return scatterData;
    return scatterData.filter((d) => getRiskLevel(d.riskScore) === filterRisk);
  }, [scatterData, filterRisk]);

  const radarChartData = useMemo(() => {
    if (radarData.length > 0) return radarData;

    return [
      { metric: 'Temperature', current: 78, average: 55, max: 95 },
      { metric: 'Wind Speed', current: 65, average: 40, max: 90 },
      { metric: 'Humidity', current: 25, average: 50, max: 80 },
      { metric: 'Vegetation Dry.', current: 82, average: 45, max: 100 },
      { metric: 'Slope Risk', current: 55, average: 35, max: 70 },
      { metric: 'Historical Freq.', current: 70, average: 50, max: 85 },
      { metric: 'Fuel Load', current: 60, average: 40, max: 80 },
      { metric: 'Drought Index', current: 88, average: 42, max: 95 },
    ];
  }, [radarData]);

  const treemapData = useMemo(() => {
    const grouped = { extreme: [], high: [], moderate: [], low: [] };

    scatterData.forEach((d) => {
      const level = getRiskLevel(d.riskScore);
      grouped[level].push(d);
    });

    return Object.entries(grouped)
      .filter(([_, items]) => items.length > 0)
      .map(([level, items]) => ({
        name: `${level.charAt(0).toUpperCase() + level.slice(1)} Risk`,
        children: items.map((item) => ({
          name: item.name,
          size: item.area || item.riskScore * 10,
          riskScore: item.riskScore,
        })),
      }));
  }, [scatterData]);

  const riskDistribution = useMemo(() => {
    const dist = { extreme: 0, high: 0, moderate: 0, low: 0 };
    scatterData.forEach((d) => {
      dist[getRiskLevel(d.riskScore)]++;
    });
    return dist;
  }, [scatterData]);

  const handlePointClick = useCallback(
    (data) => {
      setSelectedPoint(data);
      onRegionSelect?.(data);
    },
    [onRegionSelect]
  );

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-56 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-72 mb-6" />
          <div className="h-[480px] bg-gray-700/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <GlobeAltIcon className="w-5 h-5 text-cyan-400" />
              {title}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    viewMode === mode.key
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Risk Distribution Summary */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {Object.entries(RISK_COLORS).map(([level, config]) => (
            <button
              key={level}
              onClick={() => setFilterRisk(filterRisk === level ? 'all' : level)}
              className={`bg-gray-900/40 rounded-lg p-3 text-left transition-all duration-200 border ${
                filterRisk === level
                  ? `border-opacity-50`
                  : 'border-transparent hover:border-gray-600'
              }`}
              style={{
                borderColor: filterRisk === level ? config.color : 'transparent',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs capitalize">{level}</span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
              </div>
              <p className="text-xl font-bold mt-1" style={{ color: config.color }}>
                {riskDistribution[level]}
              </p>
              <p className="text-gray-500 text-xs">
                {scatterData.length > 0
                  ? `${((riskDistribution[level] / scatterData.length) * 100).toFixed(0)}%`
                  : '0%'}{' '}
                of regions
              </p>
            </button>
          ))}
        </div>

        {filterRisk !== 'all' && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-gray-400 text-xs">Filtering:</span>
            <span
              className="text-xs font-medium capitalize px-2 py-0.5 rounded-full"
              style={{
                color: RISK_COLORS[filterRisk].color,
                backgroundColor: RISK_COLORS[filterRisk].bg,
              }}
            >
              {filterRisk} risk only
            </span>
            <button
              onClick={() => setFilterRisk('all')}
              className="text-gray-500 hover:text-white text-xs ml-1"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-6 pb-6">
        {viewMode === 'scatter' && (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                type="number"
                dataKey="lng"
                name="Longitude"
                domain={['auto', 'auto']}
                stroke="#6b7280"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#4b5563' }}
                label={{
                  value: 'Longitude',
                  position: 'insideBottom',
                  offset: -5,
                  fill: '#6b7280',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="lat"
                name="Latitude"
                domain={['auto', 'auto']}
                stroke="#6b7280"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#4b5563' }}
                label={{
                  value: 'Latitude',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#6b7280',
                  fontSize: 12,
                }}
              />
              <ZAxis
                type="number"
                dataKey="area"
                range={[50, 500]}
                name="Area"
              />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter
                name="Risk Zones"
                data={filteredScatterData}
                onClick={handlePointClick}
                cursor="pointer"
              >
                {filteredScatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getRiskColor(entry.riskScore)}
                    fillOpacity={
                      selectedPoint?.name === entry.name ? 1 : 0.7
                    }
                    stroke={
                      selectedPoint?.name === entry.name ? '#fff' : getRiskColor(entry.riskScore)
                    }
                    strokeWidth={selectedPoint?.name === entry.name ? 2 : 1}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'radar' && (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={height}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                <PolarGrid stroke="#374151" opacity={0.5} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#d1d5db', fontSize: 11 }}
                  stroke="#4b5563"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickCount={5}
                />
                <Radar
                  name="Max Observed"
                  dataKey="max"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
                <Radar
                  name="Historical Avg"
                  dataKey="average"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.1}
                  strokeWidth={1.5}
                />
                <Radar
                  name="Current"
                  dataKey="current"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f97316', stroke: '#1f2937', strokeWidth: 2 }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => (
                    <span className="text-gray-300 text-sm">{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17,24,39,0.95)',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                  itemStyle={{ color: '#d1d5db', fontSize: 12 }}
                  labelStyle={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {viewMode === 'treemap' && (
          <ResponsiveContainer width="100%" height={height}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#1f2937"
              strokeWidth={2}
              content={<CustomTreemapContent />}
              animationDuration={500}
            >
              <Tooltip
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const item = payload[0]?.payload;
                  if (!item || !item.name) return null;

                  return (
                    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-3 shadow-2xl">
                      <p className="text-white font-semibold text-sm">{item.name}</p>
                      {item.riskScore !== undefined && (
                        <p
                          className="text-sm font-bold mt-1"
                          style={{ color: getRiskColor(item.riskScore) }}
                        >
                          Risk: {item.riskScore?.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>

      {/* Selected Region Details */}
      {selectedPoint && viewMode === 'scatter' && (
        <div className="mx-6 mb-6 bg-gray-900/40 rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPinIcon
                className="w-5 h-5"
                style={{ color: getRiskColor(selectedPoint.riskScore) }}
              />
              <h4 className="text-white font-semibold">{selectedPoint.name}</h4>
            </div>
            <button
              onClick={() => setSelectedPoint(null)}
              className="text-gray-500 hover:text-white text-xs"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-gray-500 text-xs">Risk Score</p>
              <p
                className="text-lg font-bold"
                style={{ color: getRiskColor(selectedPoint.riskScore) }}
              >
                {selectedPoint.riskScore?.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Active Fires</p>
              <p className="text-lg font-bold text-orange-400">
                {selectedPoint.fireCount || 0}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Coverage Area</p>
              <p className="text-lg font-bold text-gray-200">
                {selectedPoint.area?.toLocaleString() || 'N/A'} acres
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Vegetation</p>
              <p className="text-sm font-medium text-green-400">
                {selectedPoint.vegetation || 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpatialDistribution;