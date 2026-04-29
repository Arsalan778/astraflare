// client/src/components/Charts/HistoricalTrends.jsx
import React, { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
  Scatter,
  ReferenceLine,
  Brush,
  Cell,
} from 'recharts';
import { format, parseISO, subMonths, subYears, subDays } from 'date-fns';
import {
  ClockIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const METRIC_OPTIONS = [
  { key: 'fireCount', label: 'Fire Count', color: '#ef4444', unit: 'fires' },
  { key: 'burnedArea', label: 'Burned Area', color: '#f97316', unit: 'acres' },
  { key: 'avgRisk', label: 'Avg Risk Score', color: '#f59e0b', unit: '%' },
  { key: 'maxRisk', label: 'Peak Risk', color: '#a855f7', unit: '%' },
  { key: 'detectionTime', label: 'Avg Detection Time', color: '#14b8a6', unit: 'min' },
  { key: 'economicLoss', label: 'Economic Impact', color: '#ec4899', unit: '$M' },
];

const CHART_TYPES = [
  { key: 'line', label: 'Line', icon: '📈' },
  { key: 'bar', label: 'Bar', icon: '📊' },
  { key: 'composed', label: 'Combined', icon: '📉' },
];

const GRANULARITY = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

const YEAR_RANGES = [
  { key: '1y', label: '1Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
  { key: '10y', label: '10Y' },
  { key: 'all', label: 'All' },
];

const CustomTooltip = ({ active, payload, label, granularity }) => {
  if (!active || !payload || !payload.length) return null;

  const formatLabel = (val) => {
    try {
      const date = parseISO(val);
      switch (granularity) {
        case 'daily':
          return format(date, 'MMM dd, yyyy');
        case 'weekly':
          return `Week of ${format(date, 'MMM dd, yyyy')}`;
        case 'monthly':
          return format(date, 'MMMM yyyy');
        case 'yearly':
          return format(date, 'yyyy');
        default:
          return format(date, 'MMM dd, yyyy');
      }
    } catch {
      return val;
    }
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl">
      <p className="text-gray-400 text-xs mb-2 flex items-center gap-1.5">
        <CalendarDaysIcon className="w-3.5 h-3.5" />
        {formatLabel(label)}
      </p>
      <div className="space-y-1.5">
        {payload
          .filter((entry) => entry.value != null)
          .map((entry, index) => {
            const metric = METRIC_OPTIONS.find((m) => m.key === entry.dataKey);
            return (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-gray-300 text-sm">{entry.name}</span>
                </div>
                <span className="text-white font-semibold text-sm">
                  {typeof entry.value === 'number'
                    ? entry.value >= 1000
                      ? `${(entry.value / 1000).toFixed(1)}k`
                      : entry.value.toFixed(1)
                    : entry.value}
                  {metric ? ` ${metric.unit}` : ''}
                </span>
              </div>
            );
          })}
      </div>
      {payload[0]?.payload?.anomaly && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <span className="text-yellow-400 text-xs flex items-center gap-1">
            ⚠️ Anomaly detected
          </span>
        </div>
      )}
    </div>
  );
};

const TrendIndicator = ({ data, metricKey }) => {
  const trend = useMemo(() => {
    if (!data || data.length < 2) return null;
    const recent = data.slice(-5);
    const older = data.slice(-10, -5);
    if (older.length === 0) return null;

    const recentAvg = recent.reduce((s, d) => s + (d[metricKey] || 0), 0) / recent.length;
    const olderAvg = older.reduce((s, d) => s + (d[metricKey] || 0), 0) / older.length;
    const change = olderAvg !== 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    return {
      direction: change >= 0 ? 'up' : 'down',
      percent: Math.abs(change).toFixed(1),
      recentAvg: recentAvg.toFixed(1),
    };
  }, [data, metricKey]);

  if (!trend) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`text-xs font-medium ${
          trend.direction === 'up' ? 'text-red-400' : 'text-green-400'
        }`}
      >
        {trend.direction === 'up' ? '↑' : '↓'} {trend.percent}%
      </span>
      <span className="text-gray-500 text-xs">vs prior period</span>
    </div>
  );
};

const HistoricalTrends = ({
  data = [],
  title = 'Historical Trends',
  subtitle = 'Long-term wildfire activity analysis',
  height = 450,
  loading = false,
  onExport,
  region = null,
  defaultMetrics = ['fireCount', 'burnedArea'],
  defaultChartType = 'composed',
  defaultGranularity = 'monthly',
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState(defaultMetrics);
  const [chartType, setChartType] = useState(defaultChartType);
  const [granularity, setGranularity] = useState(defaultGranularity);
  const [yearRange, setYearRange] = useState('5y');
  const [showTrendLine, setShowTrendLine] = useState(true);
  const [showAnomalies, setShowAnomalies] = useState(true);

  const chartData = useMemo(() => {
    if (data.length > 0) return data;

    const now = new Date();
    let points = 60;
    let intervalFn;

    switch (granularity) {
      case 'daily':
        points = yearRange === '1y' ? 365 : Math.min(365, 200);
        intervalFn = (i) => subDays(now, points - i);
        break;
      case 'weekly':
        points = yearRange === '1y' ? 52 : yearRange === '3y' ? 156 : 260;
        intervalFn = (i) => subDays(now, (points - i) * 7);
        break;
      case 'monthly':
        points =
          yearRange === '1y' ? 12 : yearRange === '3y' ? 36 : yearRange === '5y' ? 60 : 120;
        intervalFn = (i) => subMonths(now, points - i);
        break;
      case 'yearly':
        points = yearRange === '5y' ? 5 : yearRange === '10y' ? 10 : 20;
        intervalFn = (i) => subYears(now, points - i);
        break;
      default:
        points = 60;
        intervalFn = (i) => subMonths(now, points - i);
    }

    points = Math.min(points, 300);

    return Array.from({ length: points }, (_, i) => {
      const date = intervalFn(i);
      const seasonalFactor = Math.sin((i / points) * Math.PI * 4) * 0.3 + 0.7;
      const trendFactor = 1 + (i / points) * 0.3;
      const noise = () => (Math.random() - 0.5) * 0.4;

      const fireCount = Math.max(
        0,
        Math.round((15 * seasonalFactor * trendFactor + noise() * 10) * (1 + noise()))
      );
      const burnedArea = Math.max(
        0,
        parseFloat((fireCount * (45 + Math.random() * 30) * seasonalFactor).toFixed(0))
      );
      const avgRisk = parseFloat(
        Math.max(0, Math.min(100, 35 + seasonalFactor * 30 + noise() * 15)).toFixed(1)
      );
      const maxRisk = parseFloat(Math.min(100, avgRisk + 15 + Math.random() * 20).toFixed(1));
      const detectionTime = parseFloat(
        Math.max(5, 30 - (i / points) * 15 + noise() * 10).toFixed(1)
      );
      const economicLoss = parseFloat(
        Math.max(0, burnedArea * 0.05 + Math.random() * 2).toFixed(2)
      );

      const isAnomaly = Math.random() < 0.05;

      return {
        date: date.toISOString(),
        fireCount: isAnomaly ? Math.round(fireCount * 2.5) : fireCount,
        burnedArea: isAnomaly ? Math.round(burnedArea * 2.5) : burnedArea,
        avgRisk,
        maxRisk,
        detectionTime,
        economicLoss: isAnomaly ? parseFloat((economicLoss * 3).toFixed(2)) : economicLoss,
        anomaly: isAnomaly,
      };
    });
  }, [data, granularity, yearRange]);

  const trendLineData = useMemo(() => {
    if (!showTrendLine || chartData.length < 2 || selectedMetrics.length === 0) return null;

    const primaryMetric = selectedMetrics[0];
    const n = chartData.length;
    const xValues = chartData.map((_, i) => i);
    const yValues = chartData.map((d) => d[primaryMetric] || 0);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((s, x, i) => s + x * yValues[i], 0);
    const sumX2 = xValues.reduce((s, x) => s + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const startVal = intercept;
    const endVal = slope * (n - 1) + intercept;

    return { startVal, endVal, slope };
  }, [chartData, showTrendLine, selectedMetrics]);

  const averages = useMemo(() => {
    const result = {};
    selectedMetrics.forEach((metric) => {
      const values = chartData.map((d) => d[metric] || 0);
      result[metric] = values.reduce((a, b) => a + b, 0) / values.length;
    });
    return result;
  }, [chartData, selectedMetrics]);

  const toggleMetric = useCallback((key) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((m) => m !== key) : prev;
      }
      return [...prev, key];
    });
  }, []);

  const formatXAxis = useCallback(
    (tick) => {
      try {
        const date = parseISO(tick);
        switch (granularity) {
          case 'daily':
            return format(date, 'MMM dd');
          case 'weekly':
            return format(date, 'MMM dd');
          case 'monthly':
            return format(date, 'MMM yyyy');
          case 'yearly':
            return format(date, 'yyyy');
          default:
            return format(date, 'MMM yyyy');
        }
      } catch {
        return tick;
      }
    },
    [granularity]
  );

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport({ data: chartData, metrics: selectedMetrics, granularity, yearRange });
      return;
    }
    const headers = ['date', ...selectedMetrics].join(',');
    const rows = chartData.map((d) =>
      [d.date, ...selectedMetrics.map((m) => d[m])].join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historical_trends_${granularity}_${yearRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chartData, selectedMetrics, granularity, yearRange, onExport]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    const commonAxes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          stroke="#6b7280"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={{ stroke: '#4b5563' }}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          stroke="#6b7280"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={{ stroke: '#4b5563' }}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip content={<CustomTooltip granularity={granularity} />} />
        <Legend
          wrapperStyle={{ paddingTop: '12px' }}
          formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
        />
        <Brush
          dataKey="date"
          height={25}
          stroke="#4b5563"
          fill="#1f2937"
          tickFormatter={formatXAxis}
        />
      </>
    );

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          <defs>
            {selectedMetrics.map((key) => {
              const metric = METRIC_OPTIONS.find((m) => m.key === key);
              return (
                <linearGradient key={key} id={`hist-line-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric?.color || '#fff'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={metric?.color || '#fff'} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          {commonAxes}
          {selectedMetrics.map((key) => {
            const metric = METRIC_OPTIONS.find((m) => m.key === key);
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={metric?.label || key}
                stroke={metric?.color || '#fff'}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 5,
                  stroke: metric?.color || '#fff',
                  strokeWidth: 2,
                  fill: '#1f2937',
                }}
              />
            );
          })}
          {showTrendLine && trendLineData && selectedMetrics.length > 0 && (
            <ReferenceLine
              segment={[
                { x: chartData[0]?.date, y: trendLineData.startVal },
                { x: chartData[chartData.length - 1]?.date, y: trendLineData.endVal },
              ]}
              stroke="#94a3b8"
              strokeDasharray="8 4"
              strokeWidth={1.5}
              opacity={0.6}
            />
          )}
        </LineChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {commonAxes}
          {selectedMetrics.map((key, idx) => {
            const metric = METRIC_OPTIONS.find((m) => m.key === key);
            return (
              <Bar
                key={key}
                dataKey={key}
                name={metric?.label || key}
                fill={metric?.color || '#fff'}
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
                stackId={selectedMetrics.length > 2 ? 'stack' : undefined}
              >
                {showAnomalies &&
                  chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.anomaly ? '#fbbf24' : metric?.color || '#fff'}
                      stroke={entry.anomaly ? '#fbbf24' : 'none'}
                      strokeWidth={entry.anomaly ? 2 : 0}
                    />
                  ))}
              </Bar>
            );
          })}
          {selectedMetrics.length > 0 && averages[selectedMetrics[0]] && (
            <ReferenceLine
              y={averages[selectedMetrics[0]]}
              stroke="#94a3b8"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${averages[selectedMetrics[0]].toFixed(0)}`,
                position: 'right',
                fill: '#94a3b8',
                fontSize: 10,
              }}
            />
          )}
        </BarChart>
      );
    }

    // Composed chart
    return (
      <ComposedChart {...commonProps}>
        <defs>
          {selectedMetrics.map((key) => {
            const metric = METRIC_OPTIONS.find((m) => m.key === key);
            return (
              <linearGradient key={key} id={`hist-composed-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric?.color || '#fff'} stopOpacity={0.2} />
                <stop offset="95%" stopColor={metric?.color || '#fff'} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        {commonAxes}
        {selectedMetrics.map((key, idx) => {
          const metric = METRIC_OPTIONS.find((m) => m.key === key);
          if (idx === 0) {
            return (
              <Bar
                key={key}
                dataKey={key}
                name={metric?.label || key}
                fill={metric?.color || '#fff'}
                fillOpacity={0.6}
                radius={[4, 4, 0, 0]}
              >
                {showAnomalies &&
                  chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.anomaly ? '#fbbf24' : metric?.color || '#fff'}
                      fillOpacity={entry.anomaly ? 1 : 0.6}
                    />
                  ))}
              </Bar>
            );
          }
          return (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={metric?.label || key}
              stroke={metric?.color || '#fff'}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, stroke: metric?.color, strokeWidth: 2, fill: '#1f2937' }}
            />
          );
        })}
        {showAnomalies && (
          <Scatter
            dataKey={(d) => (d.anomaly ? d[selectedMetrics[0]] : null)}
            name="Anomalies"
            fill="#fbbf24"
            shape="star"
            legendType="star"
          />
        )}
        {selectedMetrics.length > 0 && averages[selectedMetrics[0]] && (
          <ReferenceLine
            y={averages[selectedMetrics[0]]}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            label={{
              value: `Avg`,
              position: 'right',
              fill: '#94a3b8',
              fontSize: 10,
            }}
          />
        )}
      </ComposedChart>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-64 mb-6" />
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 bg-gray-700 rounded-full w-24" />
            ))}
          </div>
          <div className="h-[450px] bg-gray-700/30 rounded-xl" />
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
              <ClockIcon className="w-5 h-5 text-blue-400" />
              {title}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">
              {subtitle}
              {region && <span className="text-blue-400"> — {region}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all border border-gray-700"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap gap-4 mt-4">
          {/* Chart Type */}
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
            {CHART_TYPES.map((type) => (
              <button
                key={type.key}
                onClick={() => setChartType(type.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  chartType === type.key
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
                title={type.label}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>

          {/* Granularity */}
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
            {GRANULARITY.map((g) => (
              <button
                key={g.key}
                onClick={() => setGranularity(g.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  granularity === g.key
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Year Range */}
          <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
            {YEAR_RANGES.map((yr) => (
              <button
                key={yr.key}
                onClick={() => setYearRange(yr.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  yearRange === yr.key
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {yr.label}
              </button>
            ))}
          </div>

          {/* Toggle Options */}
          <div className="flex items-center gap-3 ml-auto">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showTrendLine}
                onChange={(e) => setShowTrendLine(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
              />
              <span className="text-gray-400 text-xs">Trend</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnomalies}
                onChange={(e) => setShowAnomalies(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500 bg-gray-800"
              />
              <span className="text-gray-400 text-xs">Anomalies</span>
            </label>
          </div>
        </div>

        {/* Metric Selectors */}
        <div className="flex flex-wrap gap-2 mt-4">
          {METRIC_OPTIONS.map((metric) => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                selectedMetrics.includes(metric.key)
                  ? 'border-transparent shadow-lg'
                  : 'border-gray-600 opacity-50 hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedMetrics.includes(metric.key)
                  ? `${metric.color}20`
                  : 'transparent',
                color: selectedMetrics.includes(metric.key) ? metric.color : '#6b7280',
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: metric.color,
                  opacity: selectedMetrics.includes(metric.key) ? 1 : 0.4,
                }}
              />
              {metric.label}
              {selectedMetrics.includes(metric.key) && (
                <TrendIndicator data={chartData} metricKey={metric.key} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Trend Summary Footer */}
      {showTrendLine && trendLineData && (
        <div className="px-6 pb-4">
          <div className="bg-gray-900/40 rounded-lg p-3 flex items-center gap-3">
            <ArrowPathIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <p className="text-gray-400 text-xs">
              <span className="text-white font-medium">Trend Analysis:</span>{' '}
              {trendLineData.slope > 0 ? (
                <span className="text-red-400">
                  Increasing trend detected — risk metrics are rising over this period.
                </span>
              ) : (
                <span className="text-green-400">
                  Decreasing trend detected — risk metrics are declining over this period.
                </span>
              )}{' '}
              Slope: {trendLineData.slope.toFixed(4)} per interval.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalTrends;