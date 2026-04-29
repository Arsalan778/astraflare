import { Navigate, Outlet, NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Users,
  Database,
  BrainCircuit,
  Activity,
  ScrollText,
  SlidersHorizontal,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';

const ADMIN_TABS = [
  { to: '/admin', label: 'Overview', icon: Activity, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/datasets', label: 'Datasets', icon: Database },
  { to: '/admin/models', label: 'Models', icon: BrainCircuit },
  { to: '/admin/monitor', label: 'System Monitor', icon: Activity },
  { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/admin/thresholds', label: 'Thresholds', icon: SlidersHorizontal },
];

export default function AdminLayout() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldAlert size={48} className="text-red-500" />
        <h2 className="text-xl font-semibold text-white">Access Denied</h2>
        <p className="text-slate-400 text-sm text-center max-w-md">
          You do not have the required permissions to access the admin panel.
          Contact your system administrator if you believe this is an error.
        </p>
        <NavLink
          to="/"
          className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors mt-2"
        >
          <ArrowLeft size={14} /> Return to Dashboard
        </NavLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Administration</h2>
            <p className="text-xs text-slate-500">
              System management and configuration
            </p>
          </div>
        </div>

        <NavLink
          to="/"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to app
        </NavLink>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-slate-800">
        <nav className="flex gap-1 overflow-x-auto pb-px scrollbar-none -mb-px">
          {ADMIN_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap border-b-2 transition-all duration-200
                ${
                  isActive
                    ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                }`
              }
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* System status bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard label="API Latency" value="42ms" status="good" />
        <StatusCard label="ML Service" value="Online" status="good" />
        <StatusCard label="Queue Jobs" value="12" status="warn" />
        <StatusCard label="DB Connections" value="24/100" status="good" />
      </div>

      {/* Admin content */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <Outlet />
      </div>
    </div>
  );
}

function StatusCard({ label, value, status }) {
  const statusColors = {
    good: 'bg-emerald-500',
    warn: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}