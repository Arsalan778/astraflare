// client/src/components/Admin/AuditLog.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  GlobeAltIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  XMarkIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../Common/LoadingSpinner';
import GlowCard from '../Common/GlowCard';
import useDebounce from '../../hooks/useDebounce';

const ACTION_CATEGORIES = [
  { value: 'all', label: 'All Actions' },
  { value: 'auth', label: 'Authentication' },
  { value: 'user', label: 'User Management' },
  { value: 'prediction', label: 'Predictions' },
  { value: 'model', label: 'Model Operations' },
  { value: 'dataset', label: 'Dataset Operations' },
  { value: 'alert', label: 'Alerts' },
  { value: 'config', label: 'Configuration' },
  { value: 'system', label: 'System' },
];

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
];

const SEVERITY_MAP = {
  info: {
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: InformationCircleIcon,
    dot: 'bg-blue-400',
  },
  warning: {
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    icon: ExclamationTriangleIcon,
    dot: 'bg-yellow-400',
  },
  error: {
    color: 'bg-red-500/20 text-red-300 border-red-500/30',
    icon: ExclamationTriangleIcon,
    dot: 'bg-red-400',
  },
  critical: {
    color: 'bg-red-600/30 text-red-200 border-red-600/40',
    icon: ExclamationTriangleIcon,
    dot: 'bg-red-500',
  },
  success: {
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: ShieldCheckIcon,
    dot: 'bg-emerald-400',
  },
};

const ACTION_COLORS = {
  'auth.login': 'text-emerald-400',
  'auth.logout': 'text-gray-400',
  'auth.failed_login': 'text-red-400',
  'auth.register': 'text-blue-400',
  'auth.password_reset': 'text-yellow-400',
  'user.create': 'text-blue-400',
  'user.update': 'text-yellow-400',
  'user.delete': 'text-red-400',
  'user.suspend': 'text-orange-400',
  'user.activate': 'text-emerald-400',
  'model.train': 'text-purple-400',
  'model.promote': 'text-emerald-400',
  'model.deprecate': 'text-yellow-400',
  'model.delete': 'text-red-400',
  'model.export': 'text-cyan-400',
  'prediction.create': 'text-blue-400',
  'prediction.batch': 'text-indigo-400',
  'dataset.upload': 'text-cyan-400',
  'dataset.delete': 'text-red-400',
  'dataset.process': 'text-purple-400',
  'alert.create': 'text-orange-400',
  'alert.acknowledge': 'text-emerald-400',
  'alert.dismiss': 'text-gray-400',
  'config.update': 'text-yellow-400',
  'config.threshold': 'text-orange-400',
  'system.restart': 'text-red-400',
  'system.backup': 'text-blue-400',
};

const formatTimestamp = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatFullTimestamp = (ts) =>
  new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/* ─── Detail Modal ─── */
const DetailModal = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-5 h-5 text-orange-400" />
            Audit Log Detail
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Severity Banner */}
        {log.severity && SEVERITY_MAP[log.severity] && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl border mb-5 ${SEVERITY_MAP[log.severity].color}`}
          >
            {(() => {
              const SevIcon = SEVERITY_MAP[log.severity].icon;
              return <SevIcon className="w-5 h-5" />;
            })()}
            <span className="text-sm font-medium capitalize">{log.severity}</span>
          </div>
        )}

        <div className="space-y-4">
          {[
            { label: 'Action', value: log.action },
            { label: 'Category', value: log.category },
            { label: 'User', value: log.userName || log.userId || 'System' },
            { label: 'Email', value: log.userEmail || '—' },
            { label: 'IP Address', value: log.ipAddress || '—' },
            { label: 'User Agent', value: log.userAgent || '—' },
            { label: 'Timestamp', value: formatFullTimestamp(log.timestamp) },
            { label: 'Resource', value: log.resource || '—' },
            { label: 'Resource ID', value: log.resourceId || '—' },
            { label: 'Request Method', value: log.method || '—' },
            { label: 'Request Path', value: log.path || '—' },
            { label: 'Status Code', value: log.statusCode || '—' },
            { label: 'Duration', value: log.duration ? `${log.duration}ms` : '—' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-gray-800/50 last:border-0"
            >
              <span className="text-sm text-gray-500 sm:w-36 flex-shrink-0 font-medium">
                {label}
              </span>
              <span className="text-sm text-gray-200 font-mono break-all">{value}</span>
            </div>
          ))}

          {/* Changes */}
          {log.changes && Object.keys(log.changes).length > 0 && (
            <div className="pt-2">
              <span className="text-sm text-gray-500 font-medium">Changes</span>
              <div className="mt-3 space-y-2">
                {Object.entries(log.changes).map(([field, change]) => (
                  <div key={field} className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
                    <p className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider">
                      {field}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg font-mono line-through">
                        {typeof change.from === 'object'
                          ? JSON.stringify(change.from)
                          : String(change.from ?? 'null')}
                      </span>
                      <ArrowRightIcon className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                      <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg font-mono">
                        {typeof change.to === 'object'
                          ? JSON.stringify(change.to)
                          : String(change.to ?? 'null')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="pt-2">
              <span className="text-sm text-gray-500 font-medium">Metadata</span>
              <pre className="mt-3 p-4 bg-gray-800/60 rounded-xl border border-gray-700/50 text-xs text-gray-300 font-mono overflow-x-auto max-h-60">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Log Row ─── */
const LogRow = ({ log, onViewDetail }) => {
  const sevConfig = SEVERITY_MAP[log.severity] || SEVERITY_MAP.info;
  const actionColor = ACTION_COLORS[log.action] || 'text-gray-300';

  return (
    <tr className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sevConfig.dot} flex-shrink-0`} />
          <span className="text-xs text-gray-500 capitalize">{log.severity}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-mono font-medium ${actionColor}`}>{log.action}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm text-gray-300 leading-tight">
              {log.userName || 'System'}
            </p>
            {log.userEmail && (
              <p className="text-xs text-gray-600">{log.userEmail}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-400 max-w-xs truncate">
          {log.description || log.resource || '—'}
        </p>
      </td>
      <td className="px-4 py-3">
        {log.ipAddress && (
          <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
            <GlobeAltIcon className="w-3 h-3" />
            {log.ipAddress}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className="text-xs text-gray-500 cursor-help"
          title={formatFullTimestamp(log.timestamp)}
        >
          {formatTimestamp(log.timestamp)}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onViewDetail(log)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors opacity-0 group-hover:opacity-100"
          title="View details"
        >
          <EyeIcon className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

/* ─── Summary Stats ─── */
const SummaryStats = ({ stats }) => {
  if (!stats) return null;

  const items = [
    {
      label: 'Total Events',
      value: stats.total?.toLocaleString() || '0',
      color: 'text-white',
    },
    {
      label: 'Errors (24h)',
      value: stats.errors24h || 0,
      color: stats.errors24h > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      label: 'Auth Failures (24h)',
      value: stats.authFailures24h || 0,
      color: stats.authFailures24h > 10 ? 'text-red-400' : 'text-gray-300',
    },
    {
      label: 'Active Users (1h)',
      value: stats.activeUsers1h || 0,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ label, value, color }) => (
        <div
          key={label}
          className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50"
        >
          <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
};

/* ─── Main Component ─── */
export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const [stats, setStats] = useState(null);
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 400);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort: sortField,
        order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const { data } = await adminAPI.getAuditLogs(params);
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotalLogs(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter, severityFilter, dateFrom, dateTo, sortField, sortOrder]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await adminAPI.getAuditStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch audit stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, severityFilter, dateFrom, dateTo]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await adminAPI.exportAuditLogs(params);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters =
    searchTerm ||
    categoryFilter !== 'all' ||
    severityFilter !== 'all' ||
    dateFrom ||
    dateTo;

  const SortHeader = ({ field, label }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortOrder === 'desc' ? (
            <ChevronDownIcon className="w-3 h-3 text-orange-400" />
          ) : (
            <ChevronUpIcon className="w-3 h-3 text-orange-400" />
          )
        ) : (
          <ChevronDownIcon className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-7 h-7 text-orange-400" />
            Audit Log
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {totalLogs.toLocaleString()} total events tracked
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <DocumentArrowDownIcon className="w-5 h-5" />
          )}
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <SummaryStats stats={stats} />

      {/* Filters */}
      <GlowCard>
        <div className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search actions, users, IPs…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              />
            </div>

            {/* Category */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                {ACTION_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range + clear */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                  Clear filters
                </button>
              )}
              <button
                onClick={fetchLogs}
                className="p-2 bg-gray-800/60 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Log Table */}
      <GlowCard>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20">
              <ClipboardDocumentListIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No audit logs found</p>
              <p className="text-gray-500 text-sm mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Events will appear here as they occur'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <SortHeader field="severity" label="Severity" />
                  <SortHeader field="action" label="Action" />
                  <SortHeader field="userName" label="User" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    IP
                  </th>
                  <SortHeader field="timestamp" label="Time" />
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <LogRow
                    key={log._id}
                    log={log}
                    onViewDetail={setSelectedLog}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1}–
              {Math.min(page * limit, totalLogs)} of{' '}
              {totalLogs.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <ChevronLeftIcon className="w-4 h-4 -ml-2.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
                <ChevronRightIcon className="w-4 h-4 -ml-2.5" />
              </button>
            </div>
          </div>
        )}
      </GlowCard>

      {/* Detail Modal */}
      <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}