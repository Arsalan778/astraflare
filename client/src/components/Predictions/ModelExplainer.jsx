import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  InformationCircleIcon,
  ChartBarIcon,
  CpuChipIcon,
  LightBulbIcon,
  ArrowsPointingOutIcon,
  QuestionMarkCircleIcon,
  BeakerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { id: 'features', label: 'Feature Importance', icon: ChartBarIcon },
  { id: 'shap', label: 'SHAP Analysis', icon: ArrowsPointingOutIcon },
  { id: 'model', label: 'Model Info', icon: CpuChipIcon },
  { id: 'glossary', label: 'Glossary', icon: LightBulbIcon },
];

const MODEL_INFO = {
  ensemble: {
    name: 'Ensemble Stacker',
    description:
      'A meta-learning ensemble that combines predictions from Gradient Boosting, ConvLSTM, Transformer, and Bayesian Network models using a second-level stacking regressor.',
    strengths: [
      'Highest overall accuracy',
      'Robust to individual model failures',
      'Captures diverse patterns through model diversity',
      'Self-calibrating confidence intervals',
    ],
    weaknesses: [
      'Higher computational cost',
      'Less interpretable than single models',
      'Slightly higher latency',
    ],
    metrics: { accuracy: 0.94, f1Score: 0.91, auc: 0.96, mse: 0.023 },
  },
  gradient_boosting: {
    name: 'Gradient Boosting (XGBoost)',
    description:
      'An optimized gradient boosted tree model trained on tabular fire risk features including weather, topography, vegetation indices, and historical fire data.',
    strengths: [
      'Fast inference time',
      'Excellent on tabular data',
      'Highly interpretable feature importance',
      'Handles missing data well',
    ],
    weaknesses: [
      'Limited spatial awareness',
      'Cannot capture temporal sequences',
      'May overfit on small regions',
    ],
    metrics: { accuracy: 0.91, f1Score: 0.88, auc: 0.93, mse: 0.031 },
  },
  conv_lstm: {
    name: 'Convolutional LSTM',
    description:
      'A deep learning architecture combining convolutional layers for spatial feature extraction with LSTM layers for temporal sequence modeling.',
    strengths: [
      'Captures spatial patterns from satellite imagery',
      'Models temporal evolution of fire risk',
      'Excellent for spread prediction',
      'Learns complex non-linear relationships',
    ],
    weaknesses: [
      'Requires large training datasets',
      'Computationally expensive',
      'Black-box decision making',
      'Sensitive to data quality',
    ],
    metrics: { accuracy: 0.89, f1Score: 0.86, auc: 0.92, mse: 0.038 },
  },
  transformer: {
    name: 'Temporal Transformer',
    description:
      'A transformer architecture adapted for time-series fire risk prediction using self-attention mechanisms.',
    strengths: [
      'Excellent long-range temporal dependency modeling',
      'Attention weights provide some interpretability',
      'Parallelizable training',
      'Handles variable-length sequences',
    ],
    weaknesses: [
      'Data hungry architecture',
      'May struggle with small-scale spatial patterns',
      'Higher memory requirements',
    ],
    metrics: { accuracy: 0.9, f1Score: 0.87, auc: 0.93, mse: 0.034 },
  },
  bayesian: {
    name: 'Bayesian Network',
    description:
      'A probabilistic graphical model that captures causal relationships between fire risk factors and outputs calibrated probability distributions.',
    strengths: [
      'Well-calibrated uncertainty estimates',
      'Interpretable causal structure',
      'Works well with limited data',
      'Naturally handles missing values',
    ],
    weaknesses: [
      'Assumes conditional independence',
      'Scalability challenges with many variables',
      'Lower peak accuracy than deep learning models',
    ],
    metrics: { accuracy: 0.86, f1Score: 0.83, auc: 0.89, mse: 0.045 },
  },
};

const GLOSSARY_TERMS = [
  {
    term: 'Risk Score',
    definition:
      'A normalized value (0-100) representing the overall wildfire risk for a region, derived from the ML model output probabilities.',
  },
  {
    term: 'Fire Weather Index (FWI)',
    definition:
      'A meteorologically-based index used to estimate fire danger combining temperature, humidity, wind, and precipitation.',
  },
  {
    term: 'NDVI',
    definition:
      'Normalized Difference Vegetation Index — a satellite-derived measure of vegetation greenness. Lower values indicate drier, fire-prone vegetation.',
  },
  {
    term: 'Drought Index',
    definition:
      'A measure of cumulative moisture deficit in soil and vegetation indicating dryness relative to normal conditions.',
  },
  {
    term: 'SHAP Value',
    definition:
      'SHapley Additive exPlanations — a game-theoretic approach to explain individual predictions by attributing contribution to each feature.',
  },
  {
    term: 'Spread Rate',
    definition:
      'Estimated rate of fire front advancement (hectares per hour) based on fuel, wind, and terrain conditions.',
  },
  {
    term: 'Confidence Interval',
    definition:
      'A range within which the true risk score is expected to fall with a given probability (typically 95%).',
  },
  {
    term: 'Ensemble Model',
    definition:
      'A technique combining multiple ML models to produce more accurate and robust predictions than any single model.',
  },
  {
    term: 'Feature Importance',
    definition:
      'A ranking of input variables by their relative contribution to the model prediction, identifying key risk drivers.',
  },
  {
    term: 'AUC-ROC',
    definition:
      'Area Under the Receiver Operating Characteristic curve — measures a model ability to distinguish fire from no-fire events.',
  },
];

const DEFAULT_FEATURES = [
  { name: 'Temperature', importance: 0.18, value: '38°C', direction: 'up' },
  { name: 'Relative Humidity', importance: 0.15, value: '22%', direction: 'down' },
  { name: 'Wind Speed', importance: 0.14, value: '25 km/h', direction: 'up' },
  { name: 'Drought Index', importance: 0.12, value: '7.3', direction: 'up' },
  { name: 'NDVI', importance: 0.1, value: '0.28', direction: 'down' },
  { name: 'Fuel Moisture', importance: 0.08, value: '11%', direction: 'down' },
  { name: 'Slope Angle', importance: 0.07, value: '15°', direction: 'neutral' },
  { name: 'Days Since Rain', importance: 0.06, value: '18', direction: 'up' },
  { name: 'Historical Fires', importance: 0.05, value: '3', direction: 'neutral' },
  { name: 'Elevation', importance: 0.05, value: '680m', direction: 'neutral' },
];

const DEFAULT_SHAP = [
  { name: 'Temperature', shap: 0.23, baseValue: 0.4 },
  { name: 'Humidity', shap: -0.18, baseValue: 0.4 },
  { name: 'Wind Speed', shap: 0.15, baseValue: 0.4 },
  { name: 'Drought Index', shap: 0.12, baseValue: 0.4 },
  { name: 'NDVI', shap: -0.09, baseValue: 0.4 },
  { name: 'Fuel Moisture', shap: -0.07, baseValue: 0.4 },
  { name: 'Slope', shap: 0.05, baseValue: 0.4 },
  { name: 'Days Since Rain', shap: 0.08, baseValue: 0.4 },
];

const DirectionIcon = ({ direction }) => {
  if (direction === 'up' || direction === 'positive') {
    return <ArrowUpIcon className="h-3 w-3 text-red-400" />;
  }
  if (direction === 'down' || direction === 'negative') {
    return <ArrowDownIcon className="h-3 w-3 text-green-400" />;
  }
  return <MinusIcon className="h-3 w-3 text-gray-500" />;
};

const MetricBar = ({ label, value, isMSE = false }) => {
  const displayValue = isMSE ? value.toFixed(3) : `${(value * 100).toFixed(1)}%`;
  const barValue = isMSE ? Math.max(0, 1 - value * 10) : value;
  const barColor =
    barValue >= 0.9 ? 'bg-green-400' : barValue >= 0.8 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-sm font-bold text-white font-mono">{displayValue}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(barValue * 100, 100)}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  );
};

const FeatureImportanceTab = ({ features, maxImportance }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-white">Feature Importance Rankings</h3>
      <span className="text-xs text-gray-500">{features.length} features analyzed</span>
    </div>

    <div className="space-y-2">
      {features.map((feature, index) => {
        const ratio = feature.importance / maxImportance;
        const gradientEnd =
          ratio > 0.7 ? '#EF4444' : ratio > 0.4 ? '#F97316' : '#6366F1';

        return (
          <motion.div
            key={feature.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-5 text-right font-mono">
                  #{index + 1}
                </span>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                  {feature.name}
                </span>
                {feature.direction && <DirectionIcon direction={feature.direction} />}
              </div>
              <div className="flex items-center gap-3">
                {feature.value && (
                  <span className="text-xs text-gray-500 font-mono">{feature.value}</span>
                )}
                <span className="text-xs text-indigo-400 font-mono w-12 text-right">
                  {(feature.importance * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="ml-7 h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, #6366F1, ${gradientEnd})`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${ratio * 100}%` }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>

    <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex gap-2">
      <LightBulbIcon className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-indigo-300 font-medium">How to read this</p>
        <p className="text-xs text-indigo-300/70 mt-0.5">
          Longer bars indicate features with more influence. Red arrows (↑) mean the
          feature pushes risk higher; green arrows (↓) mean it decreases risk.
        </p>
      </div>
    </div>
  </div>
);

const ShapAnalysisTab = ({ shapValues, maxAbsShap, finalScore }) => {
  const baseValue = shapValues[0]?.baseValue || 0.4;
  const sorted = useMemo(
    () => [...shapValues].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap)),
    [shapValues]
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">SHAP Value Waterfall</h3>
        <p className="text-xs text-gray-400">
          Shows how each feature pushes the prediction from the base value (
          {(baseValue * 100).toFixed(0)}%) to the final score.
        </p>
      </div>

      <div className="space-y-1.5">
        {/* Base value row */}
        <div className="flex items-center gap-2 py-2 px-3 bg-gray-800/30 rounded-lg">
          <span className="text-xs text-gray-400 w-28 flex-shrink-0">Base Value</span>
          <div className="flex-1 relative h-6">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-500"
              style={{ left: `${baseValue * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-500 rounded-full border-2 border-gray-900"
              style={{ left: `calc(${baseValue * 100}% - 6px)` }}
            />
          </div>
          <span className="text-xs text-gray-400 font-mono w-16 text-right flex-shrink-0">
            {(baseValue * 100).toFixed(0)}%
          </span>
        </div>

        {/* SHAP bars */}
        {sorted.map((sv, index) => {
          const isPositive = sv.shap > 0;
          const barWidth = (Math.abs(sv.shap) / maxAbsShap) * 40;

          return (
            <motion.div
              key={sv.name}
              initial={{ opacity: 0, x: isPositive ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-gray-800/20 transition-colors"
            >
              <span className="text-xs text-gray-300 w-28 truncate flex-shrink-0">
                {sv.name}
              </span>
              <div className="flex-1 relative h-5 flex items-center">
                <div
                  className="absolute top-0 bottom-0 w-px bg-gray-700"
                  style={{ left: '50%' }}
                />
                {isPositive ? (
                  <div
                    className="h-4 rounded-r bg-gradient-to-r from-red-500/60 to-red-500/90 border border-red-500/30"
                    style={{ width: `${barWidth}%`, marginLeft: '50%' }}
                  />
                ) : (
                  <div
                    className="h-4 rounded-l bg-gradient-to-l from-blue-500/60 to-blue-500/90 border border-blue-500/30"
                    style={{
                      width: `${barWidth}%`,
                      marginLeft: `calc(50% - ${barWidth}%)`,
                    }}
                  />
                )}
              </div>
              <span
                className={`text-xs font-mono w-16 text-right flex-shrink-0 ${
                  isPositive ? 'text-red-400' : 'text-blue-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {(sv.shap * 100).toFixed(1)}%
              </span>
            </motion.div>
          );
        })}

        {/* Final score row */}
        <div className="flex items-center gap-2 py-2 px-3 bg-orange-500/10 border border-orange-500/20 rounded-lg mt-2">
          <span className="text-xs text-orange-300 font-semibold w-28 flex-shrink-0">
            Final Score
          </span>
          <div className="flex-1" />
          <span className="text-sm text-orange-400 font-bold font-mono w-16 text-right flex-shrink-0">
            {finalScore != null ? `${finalScore.toFixed(0)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/60" />
          <span className="text-xs text-gray-400">Increases risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500/60" />
          <span className="text-xs text-gray-400">Decreases risk</span>
        </div>
      </div>
    </div>
  );
};

const ModelInfoTab = ({ modelInfo }) => {
  const metricLabels = {
    accuracy: 'Accuracy',
    f1Score: 'F1 Score',
    auc: 'AUC-ROC',
    mse: 'MSE',
  };

  return (
    <div className="space-y-5">
      {/* Model header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-purple-500/20 rounded-xl">
          <CpuChipIcon className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">{modelInfo.name}</h3>
          <p className="text-sm text-gray-400 mt-1">{modelInfo.description}</p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Performance Metrics
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(modelInfo.metrics).map(([key, value]) => (
            <MetricBar
              key={key}
              label={metricLabels[key] || key}
              value={value}
              isMSE={key === 'mse'}
            />
          ))}
        </div>
      </div>

      {/* Strengths */}
      <div>
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Strengths
        </h4>
        <div className="space-y-1.5">
          {modelInfo.strengths.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span className="text-sm text-gray-300">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Limitations */}
      <div>
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Limitations
        </h4>
        <div className="space-y-1.5">
          {modelInfo.weaknesses.map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <span className="text-sm text-gray-300">{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Training Details */}
      <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Training Details
        </h4>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          {[
            { label: 'Training Data', value: '2.4M fire events' },
            { label: 'Data Range', value: '2001–2024' },
            { label: 'Last Retrained', value: new Date().toLocaleDateString() },
            { label: 'Data Sources', value: 'MODIS, FIRMS, ERA5' },
          ].map((item) => (
            <div key={item.label}>
              <span className="text-gray-500">{item.label}</span>
              <p className="text-gray-300 font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const GlossaryTab = ({ terms, expandedTerm, setExpandedTerm }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 mb-3">
      <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400" />
      <h3 className="text-sm font-semibold text-white">Term Definitions</h3>
    </div>

    {terms.map((item, index) => {
      const isExpanded = expandedTerm === item.term;

      return (
        <motion.div
          key={item.term}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="w-full text-left p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg border border-gray-700/20 transition-colors cursor-pointer"
          onClick={() => setExpandedTerm(isExpanded ? null : item.term)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-200">{item.term}</span>
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            </motion.div>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.p
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-gray-400 leading-relaxed overflow-hidden"
              >
                {item.definition}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      );
    })}
  </div>
);

const ModelExplainer = ({ prediction, onClose }) => {
  const [activeTab, setActiveTab] = useState('features');
  const [expandedTerm, setExpandedTerm] = useState(null);

  const modelUsed = prediction?.modelUsed || 'ensemble';
  const modelInfo = MODEL_INFO[modelUsed] || MODEL_INFO.ensemble;

  const featureImportance = useMemo(() => {
    const raw = prediction?.featureImportance || prediction?.topFactors || DEFAULT_FEATURES;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object' && raw !== null) {
      return Object.entries(raw).map(([name, importance]) => ({ name, importance }));
    }
    return DEFAULT_FEATURES;
  }, [prediction]);

  const shapValues = useMemo(() => {
    const raw = prediction?.shapValues || prediction?.explanation?.shap || prediction?.metadata?.shapValues || DEFAULT_SHAP;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object' && raw !== null) {
      return Object.entries(raw).map(([name, shap]) => ({ name, shap, baseValue: 0.4 }));
    }
    return DEFAULT_SHAP;
  }, [prediction]);

  const maxImportance = useMemo(
    () => Math.max(...featureImportance.map((f) => f.importance)),
    [featureImportance]
  );

  const maxAbsShap = useMemo(
    () => Math.max(...shapValues.map((s) => Math.abs(s.shap))),
    [shapValues]
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'features':
        return (
          <FeatureImportanceTab
            features={featureImportance}
            maxImportance={maxImportance}
          />
        );
      case 'shap':
        return (
          <ShapAnalysisTab
            shapValues={shapValues}
            maxAbsShap={maxAbsShap}
            finalScore={prediction?.riskScore}
          />
        );
      case 'model':
        return <ModelInfoTab modelInfo={modelInfo} />;
      case 'glossary':
        return (
          <GlossaryTab
            terms={GLOSSARY_TERMS}
            expandedTerm={expandedTerm}
            setExpandedTerm={setExpandedTerm}
          />
        );
      default:
        return null;
    }
  };

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
        className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <InformationCircleIcon className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Model Explainability</h2>
              <p className="text-xs text-gray-400">
                Understand how the prediction was made
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onClose === 'function') {
                onClose();
              }
            }}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-[60] relative pointer-events-auto"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700/50 px-2 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-indigo-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="explainer-active-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-t"
                />
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <BeakerIcon className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500">Model: {modelInfo.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onClose === 'function') {
                onClose();
              }
            }}
            className="px-4 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors z-[60] relative pointer-events-auto"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModelExplainer;