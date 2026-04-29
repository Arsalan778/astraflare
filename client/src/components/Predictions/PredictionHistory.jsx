import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ClockIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  ChevronRightIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import RiskBadge from '../Common/RiskBadge';

const RISK_FILTER_OPTIONS = [
  { value: 'all', label: 'All Levels' },
  { value: 'critical', label: 'Critical', color: 'bg-red-400' },
  { value: 'high', label: 'High', color: 'bg-orange-400' },
  { value: 'moderate', label: 'Moderate', color: 'bg-yellow-400' },
  { value: 'low', label: 'Low', color: 'bg-green-400' },
  { value: 'minimal', label: 'Minimal', color: 'bg-blue-400' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'risk-high', label: 'Highest Risk' },
  { value: 'risk-low', label: 'Lowest Risk' },
  { value: 'confidence', label: 'Highest Confidence' },
];

const TIME_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
];

const getRiskColor = (level) => {
  const colors = {
    critical: '#EF4444',
    high: '#F97316',
    moderate: '#EAB308',
    low: '#22C55E',
    minimal: '#3B82F6',
  };
  return colors[level] || '#6B7280';
};

const getTrendIcon = (trend) => {
  if (trend === 'increasing') {
    return <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-red-400" />;
  }
  if (trend === 'decreasing') {
    return <ArrowTrendingDownIcon className="h-3.5 w-3.5 text-green-400" />;
  }
  return <MinusIcon className="h-3.5 w-3.5 text-gray-500" />;
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatFullDate = (timestamp) => {
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isWithinTimeRange = (timestamp, range) => {
  if (range === 'all') return true;
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const ranges = {
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000,
    '90d': 7776000000,
  };
  return diffMs <= (ranges[range] || Infinity);
};

/* ------------------------------------------------------------------ */
/*  Mini sparkline SVG                                                 */
/* ------------------------------------------------------------------ */
const MiniSparkline = ({ data, color }) => {
  if (!data || data.length < 2) return null;

  const width = 80;
  const height = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={color}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Expanded detail section shown beneath a history row                */
/* ------------------------------------------------------------------ */
const HistoryItemExpanded = ({ item }) => (
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="overflow-hidden"
  >
    <div className="pt-3 mt-3 border-t border-gray-700/30 space-y-3">
      {/* Details Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800/40 rounded-lg p-2">
          <p className="text-[10px] text-gray-500 uppercase">Fire Probability</p>
          <p className="text-sm font-bold text-white">
            {item.fireProbability != null
              ? `${(item.fireProbability * 100).toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-2">
          <p className="text-[10px] text-gray-500 uppercase">Spread Rate</p>
          <p className="text-sm font-bold text-white">
            {item.spreadRate != null
              ? `${item.spreadRate.toFixed(1)} ha/h`
              : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-2">
          <p className="text-[10px] text-gray-500 uppercase">Model</p>
          <p className="text-sm font-bold text-white capitalize">
            {item.modelUsed || 'ensemble'}
          </p>
        </div>
      </div>

      {/* Top Factors */}
      {item.topFactors && item.topFactors.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase mb-1.5">
            Top Contributing Factors
          </p>
          <div className="space-y-1">
            {item.topFactors.slice(0, 3).map((factor, i) => (
              <div
                key={factor.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      i === 0
                        ? 'bg-red-400'
                        : i === 1
                        ? 'bg-orange-400'
                        : 'bg-yellow-400'
                    }`}
                  />
                  <span className="text-xs text-gray-400">{factor.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        i === 0
                          ? 'bg-red-400'
                          : i === 1
                          ? 'bg-orange-400'
                          : 'bg-yellow-400'
                      }`}
                      style={{ width: `${factor.importance * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 w-8 text-right">
                    {(factor.importance * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather Snapshot */}
      {item.weatherConditions && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase mb-1.5">
            Weather at Prediction Time
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              {
                icon: '🌡️',
                value: `${item.weatherConditions.temperature}°C`,
              },
              { icon: '💧', value: `${item.weatherConditions.humidity}%` },
              {
                icon: '💨',
                value: `${item.weatherConditions.windSpeed} km/h`,
              },
              {
                icon: '🌧️',
                value: `${item.weatherConditions.precipitation} mm`,
              },
            ].map((w, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-gray-800/30 rounded px-1.5 py-1"
              >
                <span className="text-xs">{w.icon}</span>
                <span className="text-[10px] text-gray-300">{w.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {item.recommendations && item.recommendations.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 uppercase mb-1.5">
            Recommendations
          </p>
          <ul className="space-y-1">
            {item.recommendations.slice(0, 3).map((rec, idx) => (
              <li
                key={idx}
                className="flex items-start gap-1.5 text-xs text-gray-400"
              >
                <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Timestamp */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
        <CalendarDaysIcon className="h-3 w-3" />
        <span>{formatFullDate(item.timestamp)}</span>
      </div>
    </div>
  </motion.div>
);

/* ------------------------------------------------------------------ */
/*  Single history row                                                 */
/* ------------------------------------------------------------------ */
const HistoryItem = ({ item, isExpanded, onToggle }) => {
  const riskColor = getRiskColor(item.riskLevel);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-3 rounded-xl border transition-all cursor-pointer ${
        isExpanded
          ? 'bg-gray-800/60 border-gray-600/50 shadow-lg'
          : 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50 hover:border-gray-600/40'
      }`}
      onClick={onToggle}
    >
      {/* Main Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Score badge */}
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${riskColor}15` }}
            >
              <span
                className="text-lg font-bold"
                style={{ color: riskColor }}
              >
                {item.riskScore?.toFixed(0) || '—'}
              </span>
            </div>
            {item.riskLevel === 'critical' && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5">
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-40" />
                <div className="absolute inset-0 bg-red-400 rounded-full" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <RiskBadge level={item.riskLevel} size="sm" />
              {item.trend && getTrendIcon(item.trend)}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {item.region?.name && (
                <>
                  <MapPinIcon className="h-3 w-3 text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate">
                    {item.region.name}
                  </span>
                  <span className="text-gray-600">·</span>
                </>
              )}
              <span className="text-xs text-gray-500">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence + expand arrow */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-500">Confidence</p>
            <p className="text-xs font-medium text-indigo-400">
              {item.confidence != null
                ? `${(item.confidence * 100).toFixed(0)}%`
                : '—'}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRightIcon className="h-4 w-4 text-gray-500" />
          </motion.div>
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {isExpanded && <HistoryItemExpanded item={item} />}
      </AnimatePresence>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
const PredictionHistory = ({ history = [], onClose, selectedRegion }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [timeRange, setTimeRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  /* ---------- derived data ---------- */
  const filteredAndSorted = useMemo(() => {
    let filtered = [...history];

    if (riskFilter !== 'all') {
      filtered = filtered.filter((item) => item.riskLevel === riskFilter);
    }

    filtered = filtered.filter((item) =>
      isWithinTimeRange(item.timestamp, timeRange)
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.region?.name?.toLowerCase().includes(q) ||
          item.riskLevel?.toLowerCase().includes(q) ||
          item.modelUsed?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        break;
      case 'oldest':
        filtered.sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        break;
      case 'risk-high':
        filtered.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
        break;
      case 'risk-low':
        filtered.sort((a, b) => (a.riskScore || 0) - (b.riskScore || 0));
        break;
      case 'confidence':
        filtered.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        break;
      default:
        break;
    }

    return filtered;
  }, [history, riskFilter, sortBy, timeRange, searchQuery]);

  const stats = useMemo(() => {
    if (filteredAndSorted.length === 0) {
      return { avg: 0, max: 0, min: 0, count: 0, trend: [] };
    }
    const scores = filteredAndSorted
      .map((item) => item.riskScore)
      .filter((s) => s != null);
    return {
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      max: Math.max(...scores),
      min: Math.min(...scores),
      count: filteredAndSorted.length,
      trend: scores.slice(0, 20).reverse(),
    };
  }, [filteredAndSorted]);

  const hasActiveFilters =
    riskFilter !== 'all' || timeRange !== 'all' || searchQuery.trim() !== '';

  /* ---------- handlers ---------- */
  const handleToggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const clearFilters = useCallback(() => {
    setRiskFilter('all');
    setTimeRange('all');
    setSearchQuery('');
    setSortBy('newest');
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Timestamp',
      'Region',
      'Risk Level',
      'Risk Score',
      'Confidence',
      'Fire Probability',
      'Spread Rate',
      'Model',
    ];
    const rows = filteredAndSorted.map((item) => [
      new Date(item.timestamp).toISOString(),
      item.region?.name || '',
      item.riskLevel || '',
      item.riskScore?.toFixed(2) || '',
      item.confidence?.toFixed(4) || '',
      item.fireProbability?.toFixed(4) || '',
      item.spreadRate?.toFixed(2) || '',
      item.modelUsed || '',
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prediction-history-${
      new Date().toISOString().split('T')[0]
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSorted]);

  /* ---------- render ---------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== HEADER ==================== */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <ClockIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Prediction History
              </h2>
              <p className="text-xs text-gray-400">
                {selectedRegion
                  ? `${selectedRegion.name} — ${stats.count} predictions`
                  : `${stats.count} predictions total`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportCSV}
              disabled={filteredAndSorted.length === 0}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export CSV"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-[60] relative pointer-events-auto"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ==================== SUMMARY STATS ==================== */}
        {stats.count > 0 && (
          <div className="px-5 py-3 border-b border-gray-700/30 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <div className="bg-gray-800/40 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">
                    Avg Risk
                  </p>
                  <p className="text-sm font-bold text-white">
                    {stats.avg.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Peak</p>
                  <p
                    className="text-sm font-bold"
                    style={{
                      color: getRiskColor(
                        stats.max >= 80
                          ? 'critical'
                          : stats.max >= 60
                          ? 'high'
                          : 'moderate'
                      ),
                    }}
                  >
                    {stats.max.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-800/40 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Low</p>
                  <p className="text-sm font-bold text-green-400">
                    {stats.min.toFixed(1)}
                  </p>
                </div>
              </div>

              {stats.trend.length >= 2 && (
                <div className="flex-shrink-0">
                  <MiniSparkline data={stats.trend} color="#A78BFA" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SEARCH + FILTERS ==================== */}
        <div className="px-5 py-3 border-b border-gray-700/30 space-y-2 flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by region, risk level, model..."
              className="w-full pl-9 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
            />
          </div>

          {/* Filter + Sort bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:text-gray-300'
                }`}
              >
                <FunnelIcon className="h-3.5 w-3.5" />
                Filters
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </button>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-400 border border-gray-700/30 hover:text-gray-300 transition-colors"
                >
                  <ArrowsUpDownIcon className="h-3.5 w-3.5" />
                  {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                </button>

                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full mt-1 left-0 bg-gray-800 border border-gray-700/50 rounded-lg shadow-xl z-10 overflow-hidden min-w-[150px]"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                            sortBy === option.value
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'text-gray-300 hover:bg-gray-700/50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Expanded filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2">
                  {/* Risk Level */}
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {RISK_FILTER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setRiskFilter(opt.value)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                            riskFilter === opt.value
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-gray-800/30 text-gray-400 border border-gray-700/20 hover:border-gray-600/40'
                          }`}
                        >
                          {opt.color && (
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${opt.color}`}
                            />
                          )}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Range */}
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                      Time Range
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {TIME_RANGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTimeRange(opt.value)}
                          className={`px-2 py-1 rounded-md text-xs transition-colors ${
                            timeRange === opt.value
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-gray-800/30 text-gray-400 border border-gray-700/20 hover:border-gray-600/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ==================== HISTORY LIST ==================== */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
          <AnimatePresence mode="popLayout">
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((item) => (
                <HistoryItem
                  key={item.id || item.timestamp}
                  item={item}
                  isExpanded={expandedId === (item.id || item.timestamp)}
                  onToggle={() =>
                    handleToggleExpand(item.id || item.timestamp)
                  }
                />
              ))
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="p-4 bg-gray-800/30 rounded-2xl mb-4">
                  <ClockIcon className="h-12 w-12 text-gray-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">
                  {hasActiveFilters
                    ? 'No Matching Predictions'
                    : 'No Prediction History'}
                </h3>
                <p className="text-xs text-gray-500 max-w-xs">
                  {hasActiveFilters
                    ? 'Try adjusting your filters or search query to see more results.'
                    : 'Run your first prediction to start building a history of wildfire risk assessments.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-3 px-4 py-1.5 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ==================== FOOTER ==================== */}
        <div className="px-5 py-3 border-t border-gray-700/50 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-500">
            {filteredAndSorted.length} of {history.length} predictions
            {hasActiveFilters && ' (filtered)'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PredictionHistory;