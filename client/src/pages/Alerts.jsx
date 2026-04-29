import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BellAlertIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '@api/axios';
import AlertBanner from '@components/Alerts/AlertBanner';
import AlertList from '@components/Alerts/AlertList';
import NotificationCenter from '@components/Alerts/NotificationCenter';
import GlowCard from '@components/Common/GlowCard';
import LoadingSpinner from '@components/Common/LoadingSpinner';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | active | resolved
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, [filter, riskFilter]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (riskFilter !== 'all') params.severity = riskFilter;

      const response = await api.get('/alerts', { params });
      // The backend returns { success: true, data: [...], pagination: {...} }
      const alertsData = response.data.data || (Array.isArray(response.data) ? response.data : []);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setAlerts([]); // Reset to empty array on error to prevent filter crashes
    } finally {
      setIsLoading(false);
    }
  };

  const activeAlerts = Array.isArray(alerts) ? alerts.filter((a) => a.status === 'active') : [];
  const criticalAlerts = activeAlerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'emergency'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <BellAlertIcon className="w-6 h-6 text-red-400" />
          </div>
          Wildfire Alerts
        </h1>
        <p className="text-dark-400 mt-1">
          Monitor active fire alerts and notification history.
        </p>
      </motion.div>

      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AlertBanner alerts={criticalAlerts} />
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        className="flex flex-wrap items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 text-dark-400">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Status:</span>
        </div>
        {['all', 'active', 'resolved'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}

        <div className="w-px h-6 bg-dark-700 mx-2" />

        <div className="flex items-center gap-2 text-dark-400">
          <ExclamationTriangleIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Risk:</span>
        </div>
        {['all', 'info', 'warning', 'critical', 'emergency'].map((r) => (
          <button
            key={r}
            onClick={() => setRiskFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              riskFilter === r
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-dark-200'
            }`}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Alert List */}
        <div className="xl:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" text="Loading alerts..." />
            </div>
          ) : (
            <AlertList alerts={alerts} onRefresh={fetchAlerts} />
          )}
        </div>

        {/* Notification Center */}
        <div>
          <GlowCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Notifications
              </h3>
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <BellAlertIcon className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center py-8 text-center">
               <NotificationCenter />
               <p className="text-sm text-dark-400 mt-4">
                 Manage your alerts and notification preferences here.
               </p>
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}