// client/src/components/Charts/EmissionsChart.jsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { CloudIcon, FireIcon } from '@heroicons/react/24/outline';

const EMISSION_TYPES = {
  CO2: { color: '#ef4444', label: 'CO₂', unit: 'tonnes' },
  CO: { color: '#f97316', label: 'CO', unit: 'tonnes' },
  PM25: { color: '#a855f7', label: 'PM2.5', unit: 'kg' },
  PM10: { color: '#6366f1', label: 'PM10', unit: 'kg' },
  NOx: { color: '#14b8a6', label: 'NOₓ', unit: 'kg' },
  CH4: { color: '#f59e0b', label: 'CH₄', unit: 'tonnes' },
};

const VIEW_MODES = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'composition', label: 'Composition' },
  { key: 'comparison', label: 'Comparison' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl">
      <p className="text-gray-400 text-xs mb-2">
        {(() => {
          try {
            return format(parseISO(label), 'MMM dd, yyyy');
          } catch {
            return label;
          }
        })()}
      </p>
      <div className="space-y-1.5">
        {payload
          .filter((entry) => entry.value != null)
          .map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300 text-sm">{entry.name}</span>
              </div>
              <span className="text-white font-semibold text-sm">
                {typeof entry.value === 'number'
                  ? entry.value >= 1000
                    ? `${(entry.value / 1000).toFixed(1)}k`
                    : entry.value.toFixed(1)
                  : entry.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

const renderActiveShape = (props) => {
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={-8} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={600}>
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={12} textAnchor="middle" fill="#9ca3af" fontSize={12}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)} {payload.unit}
      </text>
      <Sector
        cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius}
        startAngle={startAngle} endAngle={endAngle} fill={fill}
      />
      <Sector
        cx={cx} cy={cy} innerRadius={outerRadius + 4} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.5}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} />
      <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill="#d1d5db" fontSize={12}>
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

const EmissionsChart = ({
  data = [],
  title = 'Emissions Estimation',
  subtitle = 'Estimated emissions from wildfire activity',
  height = 420,
  loading = false,
  region = null,
  fireSizeAcres = null,
}) => {
  const [viewMode, setViewMode] = useState('timeline');
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleSeries, setVisibleSeries] = useState(
    Object.keys(EMISSION_TYPES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  const timelineData = useMemo(() => {
    if (data.length > 0) return data;

    const days = 30;
    const now = new Date();
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(now.getTime() - (days - i) * 86400000);
      const fireFactor = Math.max(0, Math.sin(i * 0.3) * 0.6 + 0.4 + (Math.random() - 0.5) * 0.3);

      return {
        date: date.toISOString(),
        CO2: parseFloat((fireFactor * 1200 + Math.random() * 200).toFixed(1)),
        CO: parseFloat((fireFactor * 80 + Math.random() * 20).toFixed(1)),
        PM25: parseFloat((fireFactor * 45 + Math.random() * 10).toFixed(1)),
        PM10: parseFloat((fireFactor * 65 + Math.random() * 15).toFixed(1)),
        NOx: parseFloat((fireFactor * 25 + Math.random() * 8).toFixed(1)),
        CH4: parseFloat((fireFactor * 35 + Math.random() * 10).toFixed(1)),
        burnArea: parseFloat((fireFactor * 500 + Math.random() * 100).toFixed(0)),
      };
    });
  }, [data]);

  const compositionData = useMemo(() => {
    const totals = {};
    Object.keys(EMISSION_TYPES).forEach((key) => {
      totals[key] = timelineData.reduce((sum, d) => sum + (d[key] || 0), 0);
    });

    return Object.entries(totals).map(([key, value]) => ({
      name: EMISSION_TYPES[key].label,
      value: parseFloat(value.toFixed(1)),
      color: EMISSION_TYPES[key].color,
      unit: EMISSION_TYPES[key].unit,
      key,
    }));
  }, [timelineData]);

  const totalEmissions = useMemo(() => {
    return compositionData.reduce((sum, d) => sum + d.value, 0);
  }, [compositionData]);

  const summaryStats = useMemo(() => {
    const totalBurnArea = timelineData.reduce((sum, d) => sum + (d.burnArea || 0), 0);
    const avgDaily = totalEmissions / timelineData.length;
    const peakDay = timelineData.reduce(
      (max, d) => {
        const dayTotal = Object.keys(EMISSION_TYPES).reduce((s, k) => s + (d[k] || 0), 0);
        return dayTotal > max.value ? { date: d.date, value: dayTotal } : max;
      },
      { date: '', value: 0 }
    );

    return { totalBurnArea, avgDaily, peakDay };
  }, [timelineData, totalEmissions]);

  const toggleSeries = useCallback((key) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-64 mb-6" />
          <div className="h-[420px] bg-gray-700/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CloudIcon className="w-5 h-5 text-red-400" />
              {title}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">
              {subtitle}
              {region && <span className="text-red-400"> — {region}</span>}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  viewMode === mode.key
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-900/40 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Total Emissions</p>
            <p className="text-xl font-bold text-red-400">
              {totalEmissions >= 1000
                ? `${(totalEmissions / 1000).toFixed(1)}k`
                : totalEmissions.toFixed(0)}{' '}
              <span className="text-xs text-gray-400 font-normal">tonnes</span>
            </p>
          </div>
          <div className="bg-gray-900/40 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Burn Area</p>
            <p className="text-xl font-bold text-orange-400">
              {summaryStats.totalBurnArea >= 1000
                ? `${(summaryStats.totalBurnArea / 1000).toFixed(1)}k`
                : summaryStats.totalBurnArea.toFixed(0)}{' '}
              <span className="text-xs text-gray-400 font-normal">acres</span>
            </p>
          </div>
          <div className="bg-gray-900/40 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Avg Daily</p>
            <p className="text-xl font-bold text-yellow-400">
              {summaryStats.avgDaily.toFixed(0)}{' '}
              <span className="text-xs text-gray-400 font-normal">tonnes/day</span>
            </p>
          </div>
          <div className="bg-gray-900/40 rounded-lg p-3">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Peak Day</p>
            <p className="text-xl font-bold text-purple-400">
              {summaryStats.peakDay.value.toFixed(0)}{' '}
              <span className="text-xs text-gray-400 font-normal">tonnes</span>
            </p>
          </div>
        </div>

        {/* Series Toggle (only for timeline) */}
        {viewMode === 'timeline' && (
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(EMISSION_TYPES).map(([key, config]) => (
              <button
                key={key}
                onClick={() => toggleSeries(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  visibleSeries[key]
                    ? 'border-transparent'
                    : 'border-gray-600 opacity-40'
                }`}
                style={{
                  backgroundColor: visibleSeries[key] ? `${config.color}20` : 'transparent',
                  color: visibleSeries[key] ? config.color : '#6b7280',
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color, opacity: visibleSeries[key] ? 1 : 0.3 }}
                />
                {config.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-6 pb-6">
        {viewMode === 'timeline' && (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {Object.entries(EMISSION_TYPES).map(([key, config]) => (
                  <linearGradient key={key} id={`emission-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={(tick) => {
                  try {
                    return format(parseISO(tick), 'MMM dd');
                  } catch {
                    return tick;
                  }
                }}
                stroke="#6b7280"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#4b5563' }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#4b5563' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {Object.entries(EMISSION_TYPES).map(([key, config]) =>
                visibleSeries[key] ? (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={config.label}
                    stroke={config.color}
                    strokeWidth={2}
                    fill={`url(#emission-${key})`}
                    fillOpacity={1}
                    dot={false}
                    stackId="emissions"
                  />
                ) : null
              )}

              <Line
                type="monotone"
                dataKey="burnArea"
                name="Burn Area (acres)"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                yAxisId={0}
                opacity={0.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'composition' && (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={compositionData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={130}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {compositionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'comparison' && (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={compositionData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                tick={{ fontSize: 12, fill: '#d1d5db' }}
                axisLine={{ stroke: '#4b5563' }}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#4b5563' }}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Total Emissions" radius={[8, 8, 0, 0]}>
                {compositionData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default EmissionsChart;