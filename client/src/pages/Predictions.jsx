import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { CpuChipIcon } from '@heroicons/react/24/outline';

import { fetchRegions, fetchPredictionHistory } from '@store/predictionSlice';
import PredictionPanel from '@components/Predictions/PredictionPanel';
import PredictionHistory from '@components/Predictions/PredictionHistory';
import RegionSelector from '@components/Predictions/RegionSelector';
import RiskGauge from '@components/Predictions/RiskGauge';
import ModelExplainer from '@components/Predictions/ModelExplainer';
import GlowCard from '@components/Common/GlowCard';

export default function Predictions() {
  const dispatch = useDispatch();
  const { currentPrediction, selectedRegion, isLoading } = useSelector(
    (state) => state.predictions
  );

  useEffect(() => {
    dispatch(fetchRegions());
    dispatch(fetchPredictionHistory({ limit: 20 }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <CpuChipIcon className="w-6 h-6 text-purple-400" />
          </div>
          Wildfire Risk Predictions
        </h1>
        <p className="text-dark-400 mt-1">
          Run AI-powered risk assessments for any monitored region.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Region Selector + Prediction Panel */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlowCard className="p-6">
              <RegionSelector />
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PredictionPanel />
          </motion.div>

        </div>

        {/* Right Column — Risk Gauge + History */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlowCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Risk Assessment
              </h3>
              <RiskGauge
                value={currentPrediction?.riskScore || 0}
                label={selectedRegion?.name || 'Select a region'}
              />
            </GlowCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlowCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Recent Predictions
              </h3>
              <PredictionHistory />
            </GlowCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}