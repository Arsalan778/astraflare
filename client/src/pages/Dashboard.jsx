import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FireIcon,
  MapIcon,
  BellAlertIcon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

import { fetchRiskTrends, fetchFeatureImportance, fetchStats } from '@store/predictionSlice';
import { fetchHeatmapData } from '@store/mapSlice';
import GlowCard from '@components/Common/GlowCard';
import AnimatedCounter from '@components/Common/AnimatedCounter';
import RiskBadge from '@components/Common/RiskBadge';
import RiskTrendChart from '@components/Charts/RiskTrendChart';
import FeatureImportance from '@components/Charts/FeatureImportance';
import LoadingSpinner from '@components/Common/LoadingSpinner';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const { riskTrends, featureImportance, stats, isLoading } = useSelector(
    (state) => state.predictions
  );
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchRiskTrends({ period: '7d' }));
    dispatch(fetchFeatureImportance());
    dispatch(fetchHeatmapData());
    dispatch(fetchStats({ days: 7 }));
  }, [dispatch]);

  const statCards = [
    {
      label: 'Active Alerts',
      value: stats.activeAlerts,
      icon: BellAlertIcon,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      link: '/alerts',
    },
    {
      label: 'Monitored Regions',
      value: stats.monitoredRegions,
      icon: GlobeAltIcon,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      link: '/map',
    },
    {
      label: 'Predictions Today',
      value: stats.predictionsToday,
      icon: CpuChipIcon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      link: '/predictions',
    },
    {
      label: 'Avg Risk Score',
      value: stats.avgRiskScore,
      icon: ArrowTrendingUpIcon,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10',
      borderColor: 'border-primary-500/20',
      suffix: '%',
    },
    {
      label: 'High-Risk Zones',
      value: stats.highRiskZones,
      icon: ExclamationTriangleIcon,
      color: 'text-fire-400',
      bgColor: 'bg-fire-500/10',
      borderColor: 'border-fire-500/20',
      link: '/map',
    },
    {
      label: 'Model Accuracy',
      value: stats.modelAccuracy,
      icon: FireIcon,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      suffix: '%',
      decimals: 1,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero / Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-1">
          Welcome back,{' '}
          <span className="text-fire-gradient">
            {user?.firstName || 'Operator'}
          </span>
        </h1>
        <p className="text-dark-400 text-lg">
          Real-time wildfire intelligence at your fingertips.
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {statCards.map((stat) => {
          const Wrapper = stat.link ? Link : 'div';
          return (
            <motion.div key={stat.label} variants={item}>
              <Wrapper to={stat.link || '#'}>
                <GlowCard className="p-5 h-full" hoverGlow>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`p-2 rounded-lg ${stat.bgColor} ${stat.borderColor} border`}
                    >
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    <AnimatedCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                    />
                  </div>
                  <div className="text-sm text-dark-400 mt-1">{stat.label}</div>
                </GlowCard>
              </Wrapper>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlowCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-primary-400" />
              Risk Trends (7 Day)
            </h2>
            {isLoading.riskTrends ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <RiskTrendChart data={riskTrends} />
            )}
          </GlowCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlowCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-5 h-5 text-purple-400" />
              Feature Importance
            </h2>
            {isLoading.featureImportance ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <FeatureImportance data={featureImportance} />
            )}
          </GlowCard>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              to: '/map',
              icon: MapIcon,
              label: 'Live Map',
              desc: 'View real-time fire risk heatmap',
              color: 'from-blue-500 to-cyan-500',
            },
            {
              to: '/predictions',
              icon: CpuChipIcon,
              label: 'New Prediction',
              desc: 'Run ML prediction for a region',
              color: 'from-purple-500 to-pink-500',
            },
            {
              to: '/pyrosage',
              icon: ChatBubbleLeftRightIcon,
              label: 'Ask PyroSage',
              desc: 'Chat with wildfire AI assistant',
              color: 'from-primary-500 to-fire-500',
            },
            {
              to: '/alerts',
              icon: BellAlertIcon,
              label: 'View Alerts',
              desc: 'Check active wildfire alerts',
              color: 'from-red-500 to-orange-500',
            },
          ].map((action) => (
            <Link key={action.to} to={action.to}>
              <div className="glass-panel-hover p-5 group cursor-pointer">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">{action.label}</h3>
                <p className="text-sm text-dark-400 mt-1">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}