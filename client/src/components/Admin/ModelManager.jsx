// client/src/components/Admin/ModelManager.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  CpuChipIcon,
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ClockIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  BeakerIcon,
  XMarkIcon,
  Cog6ToothIcon,
  RocketLaunchIcon,
  ArchiveBoxXMarkIcon,
  ArrowTrendingUpIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../Common/LoadingSpinner';
import GlowCard from '../Common/GlowCard';

const STATUS_MAP = {
  active: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Active' },
  training: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Training' },
  idle: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Idle' },
  failed: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Failed' },
  deprecated: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Deprecated' },
};

const MODEL_TYPES = [
  { value: 'gradient_boosting', label: 'Gradient Boosting (XGBoost)' },
  { value: 'conv_lstm', label: 'ConvLSTM (Spatio-Temporal)' },
  { value: 'transformer', label: 'Transformer' },
  { value: 'bayesian_network', label: 'Bayesian Network' },
  { value: 'ensemble', label: 'Ensemble Stacker' },
  { value: 'automl', label: 'AutoML Pipeline' },
];

/* ─── Metric Card ─── */
const MetricCard = ({ label, value, suffix = '', icon: Icon, trend }) => (
  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      {Icon && <Icon className="w-4 h-4 text-gray-500" />}
    </div>
    <div className="flex items-end gap-1">
      <span className="text-2xl font-bold text-white">{value}</span>
      {suffix && <span className="text-sm text-gray-400 mb-0.5">{suffix}</span>}
    </div>
    {trend !== undefined && (
      <p className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs previous
      </p>
    )}
  </div>
);

/* ─── Training Config Modal ─── */
const TrainingConfigModal = ({ open, onClose, onStart, modelName }) => {
  const [config, setConfig] = useState({
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    earlyStopping: true,
    patience: 10,
    datasetId: '',
  });
  const [datasets, setDatasets] = useState([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (open) {
      adminAPI.getDatasets().then(({ data }) => {
        setDatasets(data.datasets?.filter((d) => d.status === 'processed') || []);
      }).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const handleStart = async () => {
    setStarting(true);
    try {
      await onStart(config);
      onClose();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BeakerIcon className="w-5 h-5 text-orange-400" />
            Training Configuration — {modelName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Epochs</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={config.epochs}
              onChange={(e) => setConfig((c) => ({ ...c, epochs: parseInt(e.target.value) || 1 }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Batch Size</label>
            <select
              value={config.batchSize}
              onChange={(e) => setConfig((c) => ({ ...c, batchSize: parseInt(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            >
              {[8, 16, 32, 64, 128, 256].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Learning Rate</label>
            <input
              type="number"
              step={0.0001}
              min={0.00001}
              max={1}
              value={config.learningRate}
              onChange={(e) => setConfig((c) => ({ ...c, learningRate: parseFloat(e.target.value) || 0.001 }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Validation Split</label>
            <input
              type="number"
              step={0.05}
              min={0.05}
              max={0.5}
              value={config.validationSplit}
              onChange={(e) => setConfig((c) => ({ ...c, validationSplit: parseFloat(e.target.value) || 0.2 }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Dataset</label>
            <select
              value={config.datasetId}
              onChange={(e) => setConfig((c) => ({ ...c, datasetId: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            >
              <option value="">Select dataset…</option>
              {datasets.map((ds) => (
                <option key={ds._id} value={ds._id}>
                  {ds.name} ({ds.category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Patience (Early Stop)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={config.patience}
              onChange={(e) => setConfig((c) => ({ ...c, patience: parseInt(e.target.value) || 10 }))}
              disabled={!config.earlyStopping}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.earlyStopping}
              onChange={(e) => setConfig((c) => ({ ...c, earlyStopping: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600" />
          </label>
          <span className="text-sm text-gray-300">Enable Early Stopping</span>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={starting || !config.datasetId}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {starting ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            Start Training
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Comparison Modal ─── */
const ComparisonModal = ({ open, onClose, models }) => {
  if (!open || !models || models.length < 2) return null;

  const metricKeys = ['accuracy', 'f1Score', 'aucRoc', 'precision', 'recall', 'avgLatencyMs'];
  const metricLabels = {
    accuracy: 'Accuracy',
    f1Score: 'F1 Score',
    aucRoc: 'AUC-ROC',
    precision: 'Precision',
    recall: 'Recall',
    avgLatencyMs: 'Avg Latency (ms)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-5 h-5 text-orange-400" />
            Model Comparison
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider">Metric</th>
                {models.map((m) => (
                  <th key={m._id} className="px-4 py-3 text-left text-xs text-gray-400 uppercase tracking-wider">
                    {m.name} v{m.version}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {metricKeys.map((key) => {
                const values = models.map((m) => m.metrics?.[key]);
                const isLatency = key === 'avgLatencyMs';
                const best = isLatency
                  ? Math.min(...values.filter((v) => v !== undefined))
                  : Math.max(...values.filter((v) => v !== undefined));

                return (
                  <tr key={key} className="hover:bg-gray-800/20">
                    <td className="px-4 py-3 text-sm text-gray-300 font-medium">
                      {metricLabels[key]}
                    </td>
                    {values.map((val, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 text-sm font-mono ${
                          val !== undefined && val === best
                            ? 'text-emerald-400 font-semibold'
                            : 'text-gray-400'
                        }`}
                      >
                        {val !== undefined ? (isLatency ? `${val.toFixed(0)}ms` : val.toFixed(4)) : '—'}
                        {val !== undefined && val === best && (
                          <span className="ml-1 text-xs">★</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="hover:bg-gray-800/20">
                <td className="px-4 py-3 text-sm text-gray-300 font-medium">Status</td>
                {models.map((m) => {
                  const s = STATUS_MAP[m.status] || STATUS_MAP.idle;
                  return (
                    <td key={m._id} className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-gray-800/20">
                <td className="px-4 py-3 text-sm text-gray-300 font-medium">Trained At</td>
                {models.map((m) => (
                  <td key={m._id} className="px-4 py-3 text-sm text-gray-400">
                    {m.trainedAt ? new Date(m.trainedAt).toLocaleDateString() : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
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

/* ─── Model Card ─── */
const ModelCard = ({ model, onTrain, onPromote, onDeprecate, onDelete, onExport, onSelect, isSelected }) => {
  const status = STATUS_MAP[model.status] || STATUS_MAP.idle;

  return (
    <GlowCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(model._id)}
            className="rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500/50 mt-1"
          />
          <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl">
            <CpuChipIcon className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{model.name}</h3>
            <p className="text-gray-500 text-sm">v{model.version} • {model.type}</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
          {model.status === 'training' && <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />}
          {status.label}
        </span>
      </div>

      {model.description && (
        <p className="text-gray-400 text-sm mb-4">{model.description}</p>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="Accuracy"
          value={model.metrics?.accuracy != null ? (model.metrics.accuracy * 100).toFixed(1) : '—'}
          suffix="%"
          icon={ChartBarIcon}
          trend={model.metrics?.accuracyTrend}
        />
        <MetricCard
          label="F1 Score"
          value={model.metrics?.f1Score?.toFixed(3) || '—'}
          icon={CheckBadgeIcon}
        />
        <MetricCard
          label="AUC-ROC"
          value={model.metrics?.aucRoc?.toFixed(3) || '—'}
          icon={ArrowTrendingUpIcon}
        />
        <MetricCard
          label="Latency"
          value={model.metrics?.avgLatencyMs?.toFixed(0) || '—'}
          suffix="ms"
          icon={ClockIcon}
        />
      </div>

      {/* Training progress */}
      {model.status === 'training' && model.trainingProgress !== undefined && (
        <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span className="flex items-center gap-1">
              <ArrowPathIcon className="w-3 h-3 animate-spin text-blue-400" />
              Training in progress
            </span>
            <span>{model.trainingProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${model.trainingProgress}%` }}
            />
          </div>
          {model.currentEpoch && model.totalEpochs && (
            <p className="text-xs text-gray-500 mt-1.5">
              Epoch {model.currentEpoch} / {model.totalEpochs}
              {model.estimatedTimeRemaining && (
                <span className="ml-2">• ~{model.estimatedTimeRemaining} remaining</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-4 border-t border-gray-800/50 pt-3">
        {model.trainedAt && (
          <span className="flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            Trained {new Date(model.trainedAt).toLocaleDateString()}
          </span>
        )}
        {model.datasetName && (
          <span className="flex items-center gap-1">
            <ServerStackIcon className="w-3.5 h-3.5" />
            {model.datasetName}
          </span>
        )}
        {model.parameterCount && (
          <span className="flex items-center gap-1">
            <Cog6ToothIcon className="w-3.5 h-3.5" />
            {(model.parameterCount / 1e6).toFixed(1)}M params
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onTrain(model)}
          disabled={model.status === 'training'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlayIcon className="w-3.5 h-3.5" />
          Train
        </button>

        {model.status !== 'active' && model.status !== 'training' && (
          <button
            onClick={() => onPromote(model)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
          >
            <RocketLaunchIcon className="w-3.5 h-3.5" />
            Promote
          </button>
        )}

        {model.status === 'active' && (
          <button
            onClick={() => onDeprecate(model)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-600/30 transition-colors"
          >
            <ArchiveBoxXMarkIcon className="w-3.5 h-3.5" />
            Deprecate
          </button>
        )}

        <button
          onClick={() => onExport(model)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gray-600/20 text-gray-300 border border-gray-500/30 hover:bg-gray-600/30 transition-colors"
        >
          <DocumentArrowDownIcon className="w-3.5 h-3.5" />
          Export
        </button>

        <button
          onClick={() => onDelete(model)}
          disabled={model.status === 'active'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
        >
          <TrashIcon className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </GlowCard>
  );
};

/* ─── Main Component ─── */
export default function ModelManager() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trainingModel, setTrainingModel] = useState(null);
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [selectedModels, setSelectedModels] = useState(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getModels();
      setModels(data.models || []);
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    // Poll for training updates every 10s
    const interval = setInterval(() => {
      fetchModels();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchModels]);

  const handleTrain = (model) => {
    setTrainingModel(model);
    setShowTrainModal(true);
  };

  const handleStartTraining = async (config) => {
    try {
      await adminAPI.trainModel(trainingModel._id, config);
      fetchModels();
    } catch (err) {
      console.error('Training failed:', err);
      throw err;
    }
  };

  const handlePromote = async (model) => {
    if (!window.confirm(`Promote "${model.name} v${model.version}" to active? This will deactivate the current active model.`)) return;
    try {
      await adminAPI.promoteModel(model._id);
      fetchModels();
    } catch (err) {
      console.error('Promote failed:', err);
    }
  };

  const handleDeprecate = async (model) => {
    if (!window.confirm(`Deprecate "${model.name} v${model.version}"?`)) return;
    try {
      await adminAPI.deprecateModel(model._id);
      fetchModels();
    } catch (err) {
      console.error('Deprecate failed:', err);
    }
  };

  const handleDelete = async (model) => {
    if (!window.confirm(`Permanently delete "${model.name} v${model.version}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteModel(model._id);
      setSelectedModels((prev) => {
        const next = new Set(prev);
        next.delete(model._id);
        return next;
      });
      fetchModels();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleExport = async (model) => {
    try {
      const response = await adminAPI.exportModel(model._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${model.name}_v${model.version}.pkl`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleSelectModel = (id) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredModels = models.filter((m) => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    return true;
  });

  const comparisonModels = models.filter((m) => selectedModels.has(m._id));

  // Summary stats
  const activeCount = models.filter((m) => m.status === 'active').length;
  const trainingCount = models.filter((m) => m.status === 'training').length;
  const bestAccuracy = models.reduce((max, m) => {
    const acc = m.metrics?.accuracy;
    return acc && acc > max ? acc : max;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Model Manager</h2>
          <p className="text-gray-400 text-sm mt-1">
            Train, compare, and deploy wildfire prediction models
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedModels.size >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-xl font-medium hover:bg-purple-600/30 transition-colors"
            >
              <ArrowsRightLeftIcon className="w-5 h-5" />
              Compare ({selectedModels.size})
            </button>
          )}
          <button
            onClick={fetchModels}
            className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard label="Total Models" value={models.length} icon={CpuChipIcon} />
        <MetricCard label="Active" value={activeCount} icon={CheckBadgeIcon} />
        <MetricCard label="Training" value={trainingCount} icon={ArrowPathIcon} />
        <MetricCard
          label="Best Accuracy"
          value={bestAccuracy ? (bestAccuracy * 100).toFixed(1) : '—'}
          suffix="%"
          icon={ArrowTrendingUpIcon}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          <option value="all">All Types</option>
          {MODEL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Model Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="text-center py-20">
          <CpuChipIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No models found</p>
          <p className="text-gray-500 text-sm mt-1">Adjust your filters or train a new model</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredModels.map((model) => (
            <ModelCard
              key={model._id}
              model={model}
              onTrain={handleTrain}
              onPromote={handlePromote}
              onDeprecate={handleDeprecate}
              onDelete={handleDelete}
              onExport={handleExport}
              onSelect={handleSelectModel}
              isSelected={selectedModels.has(model._id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <TrainingConfigModal
        open={showTrainModal}
        onClose={() => {
          setShowTrainModal(false);
          setTrainingModel(null);
        }}
        onStart={handleStartTraining}
        modelName={trainingModel?.name}
      />
      <ComparisonModal
        open={showComparison}
        onClose={() => setShowComparison(false)}
        models={comparisonModels}
      />
    </div>
  );
}