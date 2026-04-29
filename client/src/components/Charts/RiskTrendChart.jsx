// client/src/components/Charts/RiskTrendChart.jsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush,
} from 'recharts';
import { format, parseISO, subDays, subHours } from 'date-fns';
import { ExclamationTriangleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

const RISK_THRESHOLDS = {
  LOW: { value: 25, color: '#22c55e', label: 'Low' },
  MODERATE: { value: 50, color: '#f59e0b', label: 'Moderate' },
  HIGH: { value: 75, color: '#f97316', label: 'High' },
  EXTREME: { value: 100, color: '#ef4444', label: 'Extreme' },
};

const TIME_RANGES = [
  { key: '6h', label: '6H', hours: 6 },
  { key: '24h', label: '24H', hours: 24 },
  { key: '7d', label: '7D', hours: 168 },
  { key: '30d', label: '30D', hours: 720 },
  { key: '90d', label: '90D', hours: 2160 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const riskValue = payload[0]?.value;
  let riskLevel = 'Low';
  let riskColor = RISK_THRESHOLDS.LOW.color;

  if (riskValue > 75) {
    riskLevel = 'Extreme';
    riskColor = RISK_THRESHOLDS.EXTREME.color;
  } else if (riskValue > 50) {
    riskLevel = 'High';
    riskColor = RISK_THRESHOLDS.HIGH.color;
  } else if (riskValue > 25) {
    riskLevel = 'Moderate';
    riskColor = RISK_THRESHOLDS.MODERATE.color;
  }

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl">
      <p className="text-gray-400 text-xs mb-2">
        {format(parseISO(label), 'MMM dd, yyyy HH:mm')}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300 text-sm">{entry.name}</span>
            </div>
            <span className="text-white font-semibold text-sm">
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-700">
        <span className="text-xs" style={{ color: riskColor }}>
          ● {riskLevel} Risk
        </span>
      </div>
    </div>
  );
};

const generateGradientId = (color, id) => `gradient-${id}-${color.replace('#', '')}`;

const RiskTrendChart = ({
  data = [],
  predictions = [],
  title = 'Risk Trend Analysis',
  showConfidenceInterval = true,
  showPredictions = true,
  showThresholds = true,
  height = 400,
  onTimeRangeChange,
  loading = false,
  region = null,
}) => {
  const [selectedRange, setSelectedRange] = useState('24h');
  const [hoveredThreshold, setHoveredThreshold] = useState(null);

  const handleTimeRangeChange = useCallback(
    (range) => {
      setSelectedRange(range);
      onTimeRangeChange?.(range);
    },
    [onTimeRangeChange]
  );

  const chartData = useMemo(() => {
    if (data.length > 0) return data;

    // Generate sample data for demo purposes
    const now = new Date();
    const rangeConfig = TIME_RANGES.find((r) => r.key === selectedRange);
    const totalPoints = Math.min(rangeConfig?.hours || 24, 200);
    const intervalMs = ((rangeConfig?.hours || 24) * 3600000) / totalPoints;

    return Array.from({ length: totalPoints }, (_, i) => {
      const timestamp = new Date(now.getTime() - (totalPoints - i) * intervalMs);
      const baseRisk = 35 + Math.sin(i * 0.15) * 20 + Math.sin(i * 0.05) * 15;
      const noise = (Math.random() - 0.5) * 10;
      const risk = Math.max(0, Math.min(100, baseRisk + noise));

      return {
        timestamp: timestamp.toISOString(),
        riskScore: parseFloat(risk.toFixed(1)),
        confidenceUpper: parseFloat(Math.min(100, risk + 8 + Math.random() * 5).toFixed(1)),
        confidenceLower: parseFloat(Math.max(0, risk - 8 - Math.random() * 5).toFixed(1)),
        temperature: parseFloat((25 + Math.sin(i * 0.1) * 10 + Math.random() * 3).toFixed(1)),
        humidity: parseFloat((40 + Math.cos(i * 0.08) * 20 + Math.random() * 5).toFixed(1)),
        windSpeed: parseFloat((10 + Math.sin(i * 0.12) * 8 + Math.random() * 3).toFixed(1)),
      };
    });
  }, [data, selectedRange]);

  const predictionData = useMemo(() => {
    if (predictions.length > 0) return predictions;
    if (!showPredictions || chartData.length === 0) return [];

    const lastPoint = chartData[chartData.length - 1];
    const lastRisk = lastPoint.riskScore;
    const lastTimestamp = new Date(lastPoint.timestamp);
    const predPoints = 24;

    return Array.from({ length: predPoints }, (_, i) => {
      const timestamp = new Date(lastTimestamp.getTime() + (i + 1) * 3600000);
      const trend = Math.sin((i + chartData.length) * 0.15) * 20;
      const risk = Math.max(0, Math.min(100, lastRisk + trend + (Math.random() - 0.5) * 8));

      return {
        timestamp: timestamp.toISOString(),
        predictedRisk: parseFloat(risk.toFixed(1)),
        predConfUpper: parseFloat(Math.min(100, risk + 12 + i * 0.5).toFixed(1)),
        predConfLower: parseFloat(Math.max(0, risk - 12 - i * 0.5).toFixed(1)),
      };
    });
  }, [predictions, showPredictions, chartData]);

  const combinedData = useMemo(() => {
    const actual = chartData.map((d) => ({
      ...d,
      predictedRisk: null,
      predConfUpper: null,
      predConfLower: null,
    }));

    // Bridge point
    if (actual.length > 0 && predictionData.length > 0) {
      const lastActual = actual[actual.length - 1];
      const bridgePoint = {
        ...lastActual,
        predictedRisk: lastActual.riskScore,
        predConfUpper: lastActual.confidenceUpper,
        predConfLower: lastActual.confidenceLower,
      };
      actual[actual.length - 1] = bridgePoint;
    }

    const predicted = predictionData.map((d) => ({
      timestamp: d.timestamp,
      riskScore: null,
      confidenceUpper: null,
      confidenceLower: null,
      predictedRisk: d.predictedRisk,
      predConfUpper: d.predConfUpper,
      predConfLower: d.predConfLower,
    }));

    return [...actual, ...predicted];
  }, [chartData, predictionData]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const risks = chartData.map((d) => d.riskScore);
    const current = risks[risks.length - 1];
    const previous = risks.length > 1 ? risks[risks.length - 2] : current;
    const avg = risks.reduce((sum, r) => sum + r, 0) / risks.length;
    const max = Math.max(...risks);
    const min = Math.min(...risks);
    const change = current - previous;
    const changePercent = previous !== 0 ? ((change / previous) * 100).toFixed(1) : 0;

    return { current, avg: avg.toFixed(1), max, min, change: change.toFixed(1), changePercent };
  }, [chartData]);

  const formatXAxis = useCallback(
    (tick) => {
      try {
        const date = parseISO(tick);
        if (selectedRange === '6h' || selectedRange === '24h') {
          return format(date, 'HH:mm');
        } else if (selectedRange === '7d') {
          return format(date, 'EEE HH:mm');
        }
        return format(date, 'MMM dd');
      } catch {
        return tick;
      }
    },
    [selectedRange]
  );

  const getRiskGradient = useCallback((value) => {
    if (value > 75) return RISK_THRESHOLDS.EXTREME.color;
    if (value > 50) return RISK_THRESHOLDS.HIGH.color;
    if (value > 25) return RISK_THRESHOLDS.MODERATE.color;
    return RISK_THRESHOLDS.LOW.color;
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-4" />
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-gray-700 rounded-lg w-12" />
            ))}
          </div>
          <div className="h-[400px] bg-gray-700/30 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-orange-400" />
              {title}
            </h3>
            {region && (
              <p className="text-gray-400 text-sm mt-0.5">Region: {region}</p>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                onClick={() => handleTimeRangeChange(range.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  selectedRange === range.key
                    ? 'bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-900/40 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Current</p>
              <p className="text-xl font-bold" style={{ color: getRiskGradient(stats.current) }}>
                {stats.current}%
              </p>
            </div>
            <div className="bg-gray-900/40 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Average</p>
              <p className="text-xl font-bold text-gray-200">{stats.avg}%</p>
            </div>
            <div className="bg-gray-900/40 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Peak</p>
              <p className="text-xl font-bold text-red-400">{stats.max}%</p>
            </div>
            <div className="bg-gray-900/40 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Low</p>
              <p className="text-xl font-bold text-green-400">{stats.min}%</p>
            </div>
            <div className="bg-gray-900/40 rounded-lg p-3">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Change</p>
              <div className="flex items-center gap-1">
                {parseFloat(stats.change) >= 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-red-400" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-green-400" />
                )}
                <p
                  className={`text-xl font-bold ${
                    parseFloat(stats.change) >= 0 ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  {stats.change > 0 ? '+' : ''}
                  {stats.change}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#f97316" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="predConfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />

            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={{ stroke: '#4b5563' }}
              interval="preserveStartEnd"
              minTickGap={50}
            />

            <YAxis
              domain={[0, 100]}
              stroke="#6b7280"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={{ stroke: '#4b5563' }}
              tickFormatter={(v) => `${v}%`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              formatter={(value) => (
                <span className="text-gray-300 text-sm">{value}</span>
              )}
            />

            {/* Threshold Lines */}
            {showThresholds &&
              Object.entries(RISK_THRESHOLDS).map(([key, threshold]) =>
                key !== 'EXTREME' ? (
                  <ReferenceLine
                    key={key}
                    y={threshold.value}
                    stroke={threshold.color}
                    strokeDasharray="5 5"
                    strokeOpacity={hoveredThreshold === key ? 0.9 : 0.35}
                    onMouseEnter={() => setHoveredThreshold(key)}
                    onMouseLeave={() => setHoveredThreshold(null)}
                    label={{
                      value: threshold.label,
                      position: 'right',
                      fill: threshold.color,
                      fontSize: 10,
                      opacity: 0.7,
                    }}
                  />
                ) : null
              )}

            {/* Confidence Interval (actual) */}
            {showConfidenceInterval && (
              <>
                <Area
                  type="monotone"
                  dataKey="confidenceUpper"
                  stroke="none"
                  fill="url(#confGradient)"
                  fillOpacity={1}
                  name="Upper CI"
                  legendType="none"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="confidenceLower"
                  stroke="none"
                  fill="#1f2937"
                  fillOpacity={1}
                  name="Lower CI"
                  legendType="none"
                  connectNulls={false}
                />
              </>
            )}

            {/* Prediction Confidence */}
            {showPredictions && showConfidenceInterval && (
              <>
                <Area
                  type="monotone"
                  dataKey="predConfUpper"
                  stroke="none"
                  fill="url(#predConfGradient)"
                  fillOpacity={1}
                  legendType="none"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="predConfLower"
                  stroke="none"
                  fill="#1f2937"
                  fillOpacity={1}
                  legendType="none"
                  connectNulls={false}
                />
              </>
            )}

            {/* Actual Risk */}
            <Area
              type="monotone"
              dataKey="riskScore"
              stroke="#f97316"
              strokeWidth={2.5}
              fill="url(#riskGradient)"
              fillOpacity={1}
              name="Risk Score"
              dot={false}
              activeDot={{
                r: 5,
                stroke: '#f97316',
                strokeWidth: 2,
                fill: '#1f2937',
              }}
              connectNulls={false}
            />

            {/* Predicted Risk */}
            {showPredictions && (
              <Area
                type="monotone"
                dataKey="predictedRisk"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="8 4"
                fill="url(#predGradient)"
                fillOpacity={1}
                name="Predicted Risk"
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: '#8b5cf6',
                  strokeWidth: 2,
                  fill: '#1f2937',
                }}
                connectNulls={false}
              />
            )}

            <Brush
              dataKey="timestamp"
              height={30}
              stroke="#4b5563"
              fill="#1f2937"
              tickFormatter={formatXAxis}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RiskTrendChart;