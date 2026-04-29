import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  CircleStackIcon,
  CpuChipIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import adminAPI from '@api/admin';
import UserManagement from '@components/Admin/UserManagement';
import DatasetUpload from '@components/Admin/DatasetUpload';
import ModelManager from '@components/Admin/ModelManager';
import SystemMonitor from '@components/Admin/SystemMonitor';
import AuditLog from '@components/Admin/AuditLog';
import ThresholdConfig from '@components/Admin/ThresholdConfig';
import GlowCard from '@components/Common/GlowCard';
import AnimatedCounter from '@components/Common/AnimatedCounter';
import LoadingSpinner from '@components/Common/LoadingSpinner';

const TABS = [
  { key: 'overview', label: 'Overview', icon: ServerStackIcon },
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'datasets', label: 'Datasets', icon: CircleStackIcon },
  { key: 'models', label: 'Models', icon: CpuChipIcon },
  { key: 'system', label: 'System', icon: ServerStackIcon },
  { key: 'audit', label: 'Audit Log', icon: ShieldCheckIcon },
  { key: 'thresholds', label: 'Thresholds', icon: AdjustmentsHorizontalIcon },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setIsLoading(true);
    try {
      const [health, metrics] = await Promise.all([
        adminAPI.getSystemHealth(),
        adminAPI.getSystemMetrics(),
      ]);
      setSystemHealth(health);
      setSystemMetrics(metrics);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const overviewStats = [
    {
      label: 'Total Users',
      value: systemMetrics?.totalUsers || 0,
      icon: UsersIcon,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Active Models',
      value: systemMetrics?.activeModels || 0,
      icon: CpuChipIcon,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Datasets',
      value: systemMetrics?.totalDatasets || 0,
      icon: CircleStackIcon,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'API Requests (24h)',
      value: systemMetrics?.apiRequests24h || 0,
      icon: ServerStackIcon,
      color: 'text-primary-400',
      bg: 'bg-primary-500/10',
      border: 'border-primary-500/20',
    },
    {
      label: 'Active Alerts',
      value: systemMetrics?.activeAlerts || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      label: 'Uptime',
      value: systemHealth?.uptimeHours || 0,
      icon: ClockIcon,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      suffix: 'h',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {overviewStats.map((stat) => (
                <motion.div key={stat.label} variants={item}>
                  <GlowCard className="p-5" hoverGlow>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${stat.bg} ${stat.border} border`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="text-sm text-dark-400 mt-1">{stat.label}</div>
                  </GlowCard>
                </motion.div>
              ))}
            </motion.div>

            {/* System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlowCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ServerStackIcon className="w-5 h-5 text-primary-400" />
                  Service Health
                </h3>
                {systemHealth?.services ? (
                  <div className="space-y-3">
                    {Object.entries(systemHealth.services).map(([name, status]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-dark-300 text-sm capitalize">
                          {name.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'healthy'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                              : status === 'degraded'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-500 text-sm">No health data available.</p>
                )}
              </GlowCard>

              <GlowCard className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CpuChipIcon className="w-5 h-5 text-purple-400" />
                  Resource Usage
                </h3>
                {systemMetrics?.resources ? (
                  <div className="space-y-4">
                    {[
                      { label: 'CPU', value: systemMetrics.resources.cpu, color: 'bg-blue-500' },
                      { label: 'Memory', value: systemMetrics.resources.memory, color: 'bg-purple-500' },
                      { label: 'Disk', value: systemMetrics.resources.disk, color: 'bg-emerald-500' },
                      { label: 'GPU', value: systemMetrics.resources.gpu || 0, color: 'bg-primary-500' },
                    ].map((res) => (
                      <div key={res.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-dark-300">{res.label}</span>
                          <span className="text-dark-400">{res.value}%</span>
                        </div>
                        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${res.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${res.value}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-dark-500 text-sm">No resource data available.</p>
                )}
              </GlowCard>
            </div>
          </div>
        );
      case 'users':
        return <UserManagement />;
      case 'datasets':
        return <DatasetUpload />;
      case 'models':
        return <ModelManager />;
      case 'system':
        return <SystemMonitor />;
      case 'audit':
        return <AuditLog />;
      case 'thresholds':
        return <ThresholdConfig />;
      default:
        return null;
    }
  };

  if (isLoading && activeTab === 'overview') {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
            <ShieldCheckIcon className="w-6 h-6 text-primary-400" />
          </div>
          Admin Dashboard
        </h1>
        <p className="text-dark-400 mt-1">
          Manage users, models, datasets, and system configuration.
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30 shadow-lg shadow-primary-500/5'
                : 'bg-dark-800/60 text-dark-400 border border-dark-700/50 hover:bg-dark-800 hover:text-dark-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderTabContent()}
      </motion.div>
    </div>
  );
}