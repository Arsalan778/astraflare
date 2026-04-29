// client/src/components/Admin/SystemMonitor.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CpuChipIcon,
  ServerStackIcon,
  CircleStackIcon,
  GlobeAltIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SignalIcon,
  ClockIcon,
  BoltIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../api/admin';
import GlowCard from '../Common/GlowCard';
import LoadingSpinner from '../Common/LoadingSpinner';

const REFRESH_INTERVALS = [
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 0, label: 'Off' },
];

/* ─── Circular Gauge ─── */
const CircularGauge = ({ value, max = 100, label, unit = '%', color = 'orange', size = 120 }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    orange: { stroke: 'stroke-orange-500', text: 'text-orange-400' },
    red: { stroke: 'stroke-red-500', text: 'text-red-400' },
    green: { stroke: 'stroke-emerald-500', text: 'text-emerald-400' },
    blue: { stroke: 'stroke-blue-500', text: 'text-blue-400' },
    purple: { stroke: 'stroke-purple-500', text: 'text-purple-400' },
  };

  const getAutoColor = () => {
    if (percentage > 90) return colorClasses.red;
    if (percentage > 70) return colorClasses.orange;
    return colorClasses.green;
  };

  const c = color === 'auto' ? getAutoColor() : (colorClasses[color] || colorClasses.orange);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${c.stroke} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={`text-2xl font-bold ${c.text}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
      <p className="text-sm text-gray-400 mt-2">{label}</p>
    </div>
  );
};

/* ─── Service Status Card ─── */
const ServiceStatusCard = ({ name, status, responseTime, uptime, icon: Icon, details }) => {
  const statusConfig = {
    healthy: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircleIcon, label: 'Healthy' },
    degraded: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: ExclamationTriangleIcon, label: 'Degraded' },
    down: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircleIcon, label: 'Down' },
    unknown: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: SignalIcon, label: 'Unknown' },
  };

  const s = statusConfig[status] || statusConfig.unknown;
  const StatusIcon = s.icon;

  return (
    <div className={`p-4 rounded-xl border ${s.border} ${s.bg} transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-800/60 rounded-lg">
            <Icon className="w-5 h-5 text-gray-300" />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">{name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusIcon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-gray-500">Response Time</span>
          <p className="text-gray-300 font-mono mt-0.5">
            {responseTime != null ? `${responseTime}ms` : '—'}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Uptime</span>
          <p className="text-gray-300 font-mono mt-0.5">
            {uptime != null ? `${uptime.toFixed(2)}%` : '—'}
          </p>
        </div>
      </div>

      {details && (
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          {Object.entries(details).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs mb-1 last:mb-0">
              <span className="text-gray-500">{key}</span>
              <span className="text-gray-300 font-mono">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Mini Sparkline ─── */
const Sparkline = ({ data = [], color = '#f97316', height = 40, width = 200 }) => {
  if (data.length < 2) return <div style={{ width, height }} />;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((val, i) => `${i * step},${height - ((val - min) / range) * (height - 4) - 2}`)
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
    </svg>
  );
};

/* ─── Queue Status ─── */
const QueueCard = ({ name, waiting, active, completed, failed }) => (
  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
    <h4 className="text-sm text-white font-medium mb-3">{name}</h4>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="flex justify-between">
        <span className="text-gray-500">Waiting</span>
        <span className="text-yellow-400 font-mono">{waiting}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Active</span>
        <span className="text-blue-400 font-mono">{active}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Completed</span>
        <span className="text-emerald-400 font-mono">{completed}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Failed</span>
        <span className="text-red-400 font-mono">{failed}</span>
      </div>
    </div>
  </div>
);

/* ─── Main Component ─── */
export default function SystemMonitor() {
  const [systemStats, setSystemStats] = useState(null);
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memHistory, setMemHistory] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const intervalRef = useRef(null);

  const fetchSystemData = useCallback(async () => {
    try {
      const [statsRes, servicesRes, queuesRes] = await Promise.all([
        adminAPI.getSystemStats(),
        adminAPI.getServiceHealth(),
        adminAPI.getQueueStatus(),
      ]);

      const stats = statsRes.data;
      setSystemStats(stats);
      setServices(servicesRes.data.services || []);
      setQueues(queuesRes.data.queues || []);
      setLastUpdate(new Date());

      // Accumulate history (keep last 60 points)
      setCpuHistory((prev) => [...prev.slice(-59), stats.cpu?.usage || 0]);
      setMemHistory((prev) => [...prev.slice(-59), stats.memory?.usagePercent || 0]);
      setRequestHistory((prev) => [...prev.slice(-59), stats.requests?.rpm || 0]);
    } catch (err) {
      console.error('Failed to fetch system data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemData();
  }, [fetchSystemData]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchSystemData, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, fetchSystemData]);

  const serviceIconMap = {
    'API Server': ServerStackIcon,
    'ML Service': CpuChipIcon,
    'Database': CircleStackIcon,
    'Redis': BoltIcon,
    'Satellite Feed': GlobeAltIcon,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">System Monitor</h2>
          <p className="text-gray-400 text-sm mt-1">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ClockIcon className="w-3.5 h-3.5" />
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-0.5">
            {REFRESH_INTERVALS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRefreshInterval(value)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  refreshInterval === value
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchSystemData}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Resource Gauges */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Resource Utilization</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
          <div className="relative">
            <CircularGauge
              value={systemStats?.cpu?.usage || 0}
              label="CPU Usage"
              color="auto"
            />
          </div>
          <div className="relative">
            <CircularGauge
              value={systemStats?.memory?.usagePercent || 0}
              label="Memory"
              color="auto"
            />
          </div>
          <div className="relative">
            <CircularGauge
              value={systemStats?.disk?.usagePercent || 0}
              label="Disk"
              color="auto"
            />
          </div>
          <div className="relative">
            <CircularGauge
              value={systemStats?.gpu?.usage || 0}
              label="GPU"
              color="blue"
            />
          </div>
        </div>

        {/* Sparklines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-800">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase">CPU History</span>
              <span className="text-xs text-orange-400 font-mono">
                {systemStats?.cpu?.usage?.toFixed(1)}%
              </span>
            </div>
            <Sparkline data={cpuHistory} color="#f97316" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase">Memory History</span>
              <span className="text-xs text-purple-400 font-mono">
                {systemStats?.memory?.usagePercent?.toFixed(1)}%
              </span>
            </div>
            <Sparkline data={memHistory} color="#a855f7" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase">Requests/min</span>
              <span className="text-xs text-blue-400 font-mono">
                {systemStats?.requests?.rpm || 0}
              </span>
            </div>
            <Sparkline data={requestHistory} color="#3b82f6" />
          </div>
        </div>
      </GlowCard>

      {/* Services Health */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Service Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {services.map((service) => (
            <ServiceStatusCard
              key={service.name}
              name={service.name}
              status={service.status}
              responseTime={service.responseTime}
              uptime={service.uptime}
              icon={serviceIconMap[service.name] || ServerStackIcon}
              details={service.details}
            />
          ))}
        </div>
      </div>

      {/* Queue Status + Additional stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queues */}
        <GlowCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BoltIcon className="w-5 h-5 text-orange-400" />
            Job Queues
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {queues.map((q) => (
              <QueueCard
                key={q.name}
                name={q.name}
                waiting={q.waiting}
                active={q.active}
                completed={q.completed}
                failed={q.failed}
              />
            ))}
            {queues.length === 0 && (
              <p className="text-gray-500 text-sm col-span-2">No queue data available</p>
            )}
          </div>
        </GlowCard>

        {/* Request Stats */}
        <GlowCard className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-orange-400" />
            Request Statistics
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Requests / min', value: systemStats?.requests?.rpm || 0, color: 'text-blue-400' },
              { label: 'Avg Response Time', value: `${systemStats?.requests?.avgResponseTime || 0}ms`, color: 'text-emerald-400' },
              { label: 'Error Rate', value: `${systemStats?.requests?.errorRate?.toFixed(2) || 0}%`, color: systemStats?.requests?.errorRate > 5 ? 'text-red-400' : 'text-emerald-400' },
              { label: 'Active Connections', value: systemStats?.requests?.activeConnections || 0, color: 'text-purple-400' },
              { label: 'WebSocket Clients', value: systemStats?.websocket?.clients || 0, color: 'text-orange-400' },
              { label: 'Total Predictions Today', value: systemStats?.predictions?.today || 0, color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                <span className="text-sm text-gray-400">{label}</span>
                <span className={`text-sm font-mono font-medium ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

      {/* System Info */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'OS', value: systemStats?.system?.os || '—' },
            { label: 'Node.js', value: systemStats?.system?.nodeVersion || '—' },
            { label: 'Python', value: systemStats?.system?.pythonVersion || '—' },
            { label: 'Uptime', value: systemStats?.system?.uptime || '—' },
            { label: 'MongoDB', value: systemStats?.system?.mongoVersion || '—' },
            { label: 'Redis', value: systemStats?.system?.redisVersion || '—' },
            { label: 'Total Memory', value: systemStats?.memory?.total || '—' },
            { label: 'Total Disk', value: systemStats?.disk?.total || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between p-3 bg-gray-800/30 rounded-lg">
              <span className="text-gray-500">{label}</span>
              <span className="text-gray-300 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </GlowCard>
    </div>
  );
}