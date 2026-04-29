// client/src/components/Alerts/AlertList.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FireIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  MegaphoneIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  MapPinIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  BellSlashIcon,
} from '@heroicons/react/24/solid';
import { useDebounce } from '../../hooks/useDebounce';
import LoadingSpinner from '../Common/LoadingSpinner';
import api from '../../api/axios';

// ── severity helpers ─────────────────────────────────────────────
const SEVERITY_META = {
  critical: {
    icon: FireIcon,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    ring: 'ring-red-500/40',
    label: 'Critical',
    priority: 0,
  },
  high: {
    icon: ExclamationTriangleIcon,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    ring: 'ring-orange-500/40',
    label: 'High',
    priority: 1,
  },
  moderate: {
    icon: ShieldExclamationIcon,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    ring: 'ring-amber-500/40',
    label: 'Moderate',
    priority: 2,
  },
  low: {
    icon: MegaphoneIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    ring: 'ring-blue-500/40',
    label: 'Low',
    priority: 3,
  },
};

const STATUS_META = {
  active: { label: 'Active', color: 'text-green-400', dot: 'bg-green-400' },
  acknowledged: { label: 'Acknowledged', color: 'text-blue-400', dot: 'bg-blue-400' },
  resolved: { label: 'Resolved', color: 'text-slate-400', dot: 'bg-slate-400' },
  expired: { label: 'Expired', color: 'text-slate-500', dot: 'bg-slate-500' },
};

const formatDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

// ── single row ───────────────────────────────────────────────────
const AlertRow = ({ alert, onView, onAcknowledge, onResolve, onDelete, expanded, onToggle }) => {
  const sev = SEVERITY_META[alert.severity] || SEVERITY_META.moderate;
  const stat = STATUS_META[alert.status] || STATUS_META.active;
  const Icon = sev.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className={`group rounded-xl border ${sev.border} ${sev.bg} backdrop-blur-sm transition-all hover:ring-1 ${sev.ring}`}
    >
      {/* header */}
      <button
        onClick={() => onToggle(alert._id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* icon */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5`}>
          <Icon className={`h-5 w-5 ${sev.color}`} />
        </div>

        {/* title + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sev.badge}`}
            >
              {sev.label}
            </span>
            <span className={`flex items-center gap-1 text-[11px] ${stat.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${stat.dot}`} />
              {stat.label}
            </span>
          </div>
          <h4 className="mt-0.5 truncate text-sm font-semibold text-white">
            {alert.title || 'Wildfire Alert'}
          </h4>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
            {alert.region && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3 w-3" /> {alert.region.name || alert.region}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" /> {timeAgo(alert.createdAt)}
            </span>
          </div>
        </div>

        {/* chevron */}
        {expanded ? (
          <ChevronUpIcon className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {/* expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/5 px-4 py-3">
              <p className="text-sm leading-relaxed text-slate-300">
                {alert.message || alert.description || 'No details available.'}
              </p>

              {/* optional metadata grid */}
              {(alert.riskScore || alert.coordinates || alert.affectedArea) && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {alert.riskScore != null && (
                    <div className="rounded-lg bg-white/5 p-2">
                      <p className="text-[10px] uppercase text-slate-500">Risk Score</p>
                      <p className="text-lg font-bold text-white">
                        {(alert.riskScore * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                  {alert.coordinates && (
                    <div className="rounded-lg bg-white/5 p-2">
                      <p className="text-[10px] uppercase text-slate-500">Coordinates</p>
                      <p className="text-xs font-medium text-white">
                        {alert.coordinates.lat?.toFixed(4)}, {alert.coordinates.lng?.toFixed(4)}
                      </p>
                    </div>
                  )}
                  {alert.affectedArea && (
                    <div className="rounded-lg bg-white/5 p-2">
                      <p className="text-[10px] uppercase text-slate-500">Affected Area</p>
                      <p className="text-xs font-medium text-white">{alert.affectedArea} km²</p>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] text-slate-500">
                Created: {formatDate(alert.createdAt)}
                {alert.updatedAt && ` · Updated: ${formatDate(alert.updatedAt)}`}
              </div>

              {/* action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onView(alert)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                >
                  <EyeIcon className="h-3.5 w-3.5" /> View on Map
                </button>
                {alert.status === 'active' && (
                  <button
                    onClick={() => onAcknowledge(alert._id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/30"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Acknowledge
                  </button>
                )}
                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => onResolve(alert._id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-300 transition hover:bg-green-500/30"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Resolve
                  </button>
                )}
                <button
                  onClick={() => onDelete(alert._id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/30"
                >
                  <TrashIcon className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main AlertList
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const AlertList = ({
  alerts: propAlerts,
  loading: propLoading,
  onViewAlert,
  onRefresh,
  fetchOnMount = true,
}) => {
  const [alerts, setAlerts] = useState(propAlerts || []);
  const [loading, setLoading] = useState(propLoading ?? false);
  const [error, setError] = useState(null);

  // filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  // ── fetch from API when no prop alerts ───────────────────────
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/alerts');
      const alertsData = data.data || data.alerts || (Array.isArray(data) ? data : []);
      setAlerts(alertsData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!propAlerts && fetchOnMount) fetchAlerts();
  }, [fetchOnMount, propAlerts, fetchAlerts]);

  useEffect(() => {
    if (propAlerts) setAlerts(propAlerts);
  }, [propAlerts]);

  useEffect(() => {
    if (propLoading !== undefined) setLoading(propLoading);
  }, [propLoading]);

  // ── filter + sort ────────────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    let list = [...alerts];

    // search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.message?.toLowerCase().includes(q) ||
          a.region?.toLowerCase().includes(q)
      );
    }

    // severity
    if (severityFilter !== 'all') {
      list = list.filter((a) => a.severity === severityFilter);
    }

    // status
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }

    // sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'severity':
          return (
            (SEVERITY_META[a.severity]?.priority ?? 9) -
            (SEVERITY_META[b.severity]?.priority ?? 9)
          );
        case 'region':
          return (a.region || '').localeCompare(b.region || '');
        default:
          return 0;
      }
    });

    return list;
  }, [alerts, debouncedSearch, severityFilter, statusFilter, sortBy]);

  // ── actions ──────────────────────────────────────────────────
  const handleAcknowledge = async (id) => {
    try {
      await api.patch(`/alerts/${id}/acknowledge`);
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: 'acknowledged' } : a))
      );
    } catch {
      /* noop */
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/alerts/${id}/resolve`);
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: 'resolved' } : a))
      );
    } catch {
      /* noop */
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch {
      /* noop */
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchAlerts();
    }
  };

  // ── severity counts for pills ────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: alerts.length, critical: 0, high: 0, moderate: 0, low: 0 };
    alerts.forEach((a) => {
      if (c[a.severity] !== undefined) c[a.severity]++;
    });
    return c;
  }, [alerts]);

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ── toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* search */}
        <div className="relative max-w-xs flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              showFilters
                ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FunnelIcon className="h-3.5 w-3.5" /> Filters
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── expanded filters ────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 sm:flex-row sm:items-center">
              {/* severity */}
              <div className="flex flex-wrap gap-1.5">
                {['all', 'critical', 'high', 'moderate', 'low'].map((s) => {
                  const active = severityFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                        active
                          ? s === 'all'
                            ? 'border-white/30 bg-white/10 text-white'
                            : `${SEVERITY_META[s]?.badge}`
                          : 'border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s === 'all' ? 'All' : SEVERITY_META[s]?.label} ({counts[s] ?? 0})
                    </button>
                  );
                })}
              </div>

              {/* status */}
              <div className="flex flex-wrap gap-1.5">
                {['all', 'active', 'acknowledged', 'resolved'].map((s) => {
                  const active = statusFilter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition ${
                        active
                          ? 'border-white/30 bg-white/10 text-white'
                          : 'border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s === 'all' ? 'All Status' : STATUS_META[s]?.label}
                    </button>
                  );
                })}
              </div>

              {/* sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500/50"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="severity">Severity</option>
                <option value="region">Region</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── error ───────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={fetchAlerts} className="ml-2 underline hover:text-red-200">
            Retry
          </button>
        </div>
      )}

      {/* ── list ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <BellSlashIcon className="h-12 w-12 mb-3 text-slate-600" />
          <p className="text-sm font-medium">No alerts found</p>
          <p className="text-xs mt-1">
            {search || severityFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'All clear — no wildfire alerts at this time.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {filteredAlerts.map((alert) => (
              <AlertRow
                key={alert._id}
                alert={alert}
                expanded={expandedId === alert._id}
                onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                onView={(a) => onViewAlert?.(a)}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── footer count ────────────────────────────────────── */}
      {!loading && filteredAlerts.length > 0 && (
        <p className="text-center text-[11px] text-slate-600">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </p>
      )}
    </div>
  );
};

export default AlertList;