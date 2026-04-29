// client/src/components/Admin/ThresholdConfig.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BellAlertIcon,
  FireIcon,
  SunIcon,
  CloudIcon,
  MapPinIcon,
  ShieldExclamationIcon,
  XMarkIcon,
  ClockIcon,
  ArrowUturnLeftIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../Common/LoadingSpinner';
import GlowCard from '../Common/GlowCard';

/* ─── Slider with visual feedback ─── */
const ThresholdSlider = ({
  label,
  description,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange,
  icon: Icon,
  colorStops,
  disabled = false,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const getThumbColor = () => {
    if (!colorStops) return '#f97316';
    for (let i = colorStops.length - 1; i >= 0; i--) {
      if (percentage >= colorStops[i].at) {
        const colorMap = {
          emerald: '#10b981',
          yellow: '#eab308',
          orange: '#f97316',
          red: '#ef4444',
          blue: '#3b82f6',
        };
        return colorMap[colorStops[i].color] || '#f97316';
      }
    }
    return '#10b981';
  };

  return (
    <div
      className={`p-5 bg-gray-800/30 rounded-xl border border-gray-700/50 transition-colors ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-gray-700/50 rounded-lg">
              <Icon className="w-5 h-5 text-orange-400" />
            </div>
          )}
          <div>
            <h4 className="text-white font-medium text-sm">{label}</h4>
            {description && (
              <p className="text-gray-500 text-xs mt-0.5 max-w-xs">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-gray-700">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) {
                onChange(Math.max(min, Math.min(max, v)));
              }
            }}
            disabled={disabled}
            className="w-16 bg-transparent text-white text-sm font-mono text-right focus:outline-none disabled:cursor-not-allowed"
          />
          {unit && <span className="text-xs text-gray-500 ml-0.5">{unit}</span>}
        </div>
      </div>

      <div className="relative mt-1">
        {/* Track background */}
        <div className="absolute inset-0 h-2 rounded-full bg-gray-700 top-1/2 -translate-y-1/2 pointer-events-none" />
        {/* Filled portion */}
        <div
          className="absolute h-2 rounded-full top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-150"
          style={{
            width: `${percentage}%`,
            backgroundColor: getThumbColor(),
            opacity: 0.7,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="relative w-full h-2 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            '--thumb-color': getThumbColor(),
          }}
        />
        {/* Min / Max labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          <span className="text-[10px] text-gray-600">
            {min}
            {unit}
          </span>
          <span className="text-[10px] text-gray-600">
            {max}
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── Toggle Setting ─── */
const ToggleSetting = ({
  label,
  description,
  value,
  onChange,
  icon: Icon,
  disabled = false,
}) => (
  <div
    className={`flex items-center justify-between p-5 bg-gray-800/30 rounded-xl border border-gray-700/50 ${
      disabled ? 'opacity-50' : ''
    }`}
  >
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2 bg-gray-700/50 rounded-lg">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
      )}
      <div>
        <h4 className="text-white font-medium text-sm">{label}</h4>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 peer-disabled:cursor-not-allowed" />
    </label>
  </div>
);

/* ─── Select Setting ─── */
const SelectSetting = ({ label, description, value, options, onChange, icon: Icon }) => (
  <div className="p-5 bg-gray-800/30 rounded-xl border border-gray-700/50">
    <div className="flex items-center gap-3 mb-3">
      {Icon && (
        <div className="p-2 bg-gray-700/50 rounded-lg">
          <Icon className="w-5 h-5 text-orange-400" />
        </div>
      )}
      <div>
        <h4 className="text-white font-medium text-sm">{label}</h4>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

/* ─── Preset Selector ─── */
const PresetSelector = ({ onApply }) => {
  const presets = [
    {
      name: 'Conservative',
      description: 'Lower thresholds — more alerts, fewer missed events',
      icon: '🛡️',
      config: {
        fireRiskThreshold: 40,
        alertMinConfidence: 0.6,
        heatIndexWarning: 35,
        windSpeedCritical: 40,
        humidityDanger: 20,
        droughtIndexThreshold: 3,
        proximityAlertRadius: 25,
        enableAutoAlerts: true,
        enableEvacuationAlerts: true,
        enableEmailNotifications: true,
        enableSmsNotifications: true,
        alertCooldown: 15,
        maxAlertsPerHour: 20,
        predictionRefreshInterval: '15',
        dataRetentionDays: 730,
      },
    },
    {
      name: 'Balanced',
      description: 'Default recommended settings for most deployments',
      icon: '⚖️',
      config: {
        fireRiskThreshold: 60,
        alertMinConfidence: 0.75,
        heatIndexWarning: 40,
        windSpeedCritical: 55,
        humidityDanger: 15,
        droughtIndexThreshold: 4,
        proximityAlertRadius: 15,
        enableAutoAlerts: true,
        enableEvacuationAlerts: true,
        enableEmailNotifications: true,
        enableSmsNotifications: false,
        alertCooldown: 30,
        maxAlertsPerHour: 10,
        predictionRefreshInterval: '30',
        dataRetentionDays: 365,
      },
    },
    {
      name: 'Minimal',
      description: 'Only critical alerts — reduces noise significantly',
      icon: '🔇',
      config: {
        fireRiskThreshold: 85,
        alertMinConfidence: 0.9,
        heatIndexWarning: 48,
        windSpeedCritical: 70,
        humidityDanger: 10,
        droughtIndexThreshold: 5,
        proximityAlertRadius: 10,
        enableAutoAlerts: true,
        enableEvacuationAlerts: true,
        enableEmailNotifications: true,
        enableSmsNotifications: false,
        alertCooldown: 60,
        maxAlertsPerHour: 5,
        predictionRefreshInterval: '60',
        dataRetentionDays: 180,
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {presets.map((preset) => (
        <button
          key={preset.name}
          onClick={() => onApply(preset.config)}
          className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left group"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{preset.icon}</span>
            <h5 className="text-white font-medium text-sm group-hover:text-orange-300 transition-colors">
              {preset.name}
            </h5>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{preset.description}</p>
        </button>
      ))}
    </div>
  );
};

/* ─── Change Summary ─── */
const ChangeSummary = ({ current, original }) => {
  if (!original) return null;

  const changes = [];
  Object.keys(current).forEach((key) => {
    if (JSON.stringify(current[key]) !== JSON.stringify(original[key])) {
      changes.push({
        key,
        from: original[key],
        to: current[key],
      });
    }
  });

  if (changes.length === 0) return null;

  const formatLabel = (key) =>
    key
      .replace(/([A-Z])/g, ' \$1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();

  const formatValue = (val) => {
    if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
    return String(val);
  };

  return (
    <GlowCard className="p-4">
      <h4 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
        <InformationCircleIcon className="w-4 h-4" />
        Pending Changes ({changes.length})
      </h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {changes.map(({ key, from, to }) => (
          <div
            key={key}
            className="flex items-center justify-between text-xs py-1.5 border-b border-gray-800/50 last:border-0"
          >
            <span className="text-gray-400">{formatLabel(key)}</span>
            <div className="flex items-center gap-2">
              <span className="text-red-400/70 line-through font-mono">
                {formatValue(from)}
              </span>
              <span className="text-gray-600">→</span>
              <span className="text-emerald-400 font-mono font-medium">
                {formatValue(to)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
};

/* ═══════════════════════════════════════════
   ─── Main Component ───
   ═══════════════════════════════════════════ */
export default function ThresholdConfig() {
  const [config, setConfig] = useState({
    // Fire risk
    fireRiskThreshold: 60,
    alertMinConfidence: 0.75,

    // Weather
    heatIndexWarning: 40,
    windSpeedCritical: 55,
    humidityDanger: 15,
    droughtIndexThreshold: 4,

    // Spatial
    proximityAlertRadius: 15,

    // Alert settings
    enableAutoAlerts: true,
    enableEvacuationAlerts: true,
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    alertCooldown: 30,
    maxAlertsPerHour: 10,

    // System
    predictionRefreshInterval: '30',
    dataRetentionDays: 365,
    enableMaintenanceMode: false,
  });

  const [originalConfig, setOriginalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getThresholdConfig();
      const serverConfig = data.config || {};
      const merged = { ...config, ...serverConfig };
      setConfig(merged);
      setOriginalConfig(merged);
    } catch (err) {
      console.error('Failed to fetch config:', err);
      setError('Failed to load configuration from server.');
      // Keep defaults as original so user can still save
      setOriginalConfig({ ...config });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateField = (field) => (value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError('');
  };

  const hasChanges = originalConfig
    ? JSON.stringify(config) !== JSON.stringify(originalConfig)
    : false;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await adminAPI.updateThresholdConfig(config);
      setOriginalConfig({ ...config });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to save configuration. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig({ ...originalConfig });
      setSaved(false);
      setError('');
    }
  };

  const handleApplyPreset = (presetConfig) => {
    setConfig((prev) => ({ ...prev, ...presetConfig }));
    setShowPresets(false);
    setSaved(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="w-7 h-7 text-orange-400" />
            Threshold Configuration
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Configure alert thresholds, notification rules, and system parameters
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors border ${
              showPresets
                ? 'bg-orange-600/20 text-orange-300 border-orange-500/40'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white hover:border-gray-600'
            }`}
          >
            <BookmarkIcon className="w-4 h-4" />
            Presets
          </button>
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              saved
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-500/20'
            }`}
          >
            {saving ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CheckIcon className="w-4 h-4" />
            )}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Status Messages ── */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2 animate-fade-in">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-2 animate-fade-in">
          <CheckIcon className="w-5 h-5 flex-shrink-0" />
          Configuration saved successfully. Changes are now live.
        </div>
      )}

      {/* ── Change Summary ── */}
      {hasChanges && !saved && (
        <ChangeSummary current={config} original={originalConfig} />
      )}

      {/* ── Presets ── */}
      {showPresets && (
        <GlowCard className="p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Quick Presets</h3>
            <button
              onClick={() => setShowPresets(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <PresetSelector onApply={handleApplyPreset} />
        </GlowCard>
      )}

      {/* ══════════════════════════════════════
         Section 1 — Fire Risk Thresholds
         ══════════════════════════════════════ */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <FireIcon className="w-5 h-5 text-red-400" />
          Fire Risk Thresholds
        </h3>
        <p className="text-gray-500 text-sm mb-5">
          Define when alerts should be triggered based on model risk scores.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ThresholdSlider
            label="Fire Risk Alert Threshold"
            description="Minimum risk score (0–100) to trigger a fire alert"
            value={config.fireRiskThreshold}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={updateField('fireRiskThreshold')}
            icon={FireIcon}
            colorStops={[
              { at: 0, color: 'emerald' },
              { at: 40, color: 'yellow' },
              { at: 70, color: 'orange' },
              { at: 85, color: 'red' },
            ]}
          />
          <ThresholdSlider
            label="Minimum Model Confidence"
            description="Minimum prediction confidence required to issue alerts"
            value={config.alertMinConfidence}
            min={0}
            max={1}
            step={0.01}
            unit=""
            onChange={updateField('alertMinConfidence')}
            icon={ShieldExclamationIcon}
            colorStops={[
              { at: 0, color: 'red' },
              { at: 40, color: 'yellow' },
              { at: 70, color: 'emerald' },
            ]}
          />
        </div>
      </GlowCard>

      {/* ══════════════════════════════════════
         Section 2 — Weather Thresholds
         ══════════════════════════════════════ */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <CloudIcon className="w-5 h-5 text-blue-400" />
          Weather Thresholds
        </h3>
        <p className="text-gray-500 text-sm mb-5">
          Weather conditions that contribute to elevated fire danger.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ThresholdSlider
            label="Heat Index Warning"
            description="Temperature (°C) above which heat warnings are raised"
            value={config.heatIndexWarning}
            min={20}
            max={60}
            step={1}
            unit="°C"
            onChange={updateField('heatIndexWarning')}
            icon={SunIcon}
            colorStops={[
              { at: 0, color: 'emerald' },
              { at: 40, color: 'yellow' },
              { at: 70, color: 'red' },
            ]}
          />
          <ThresholdSlider
            label="Critical Wind Speed"
            description="Wind speed (km/h) considered dangerous for fire spread"
            value={config.windSpeedCritical}
            min={10}
            max={120}
            step={5}
            unit="km/h"
            onChange={updateField('windSpeedCritical')}
            icon={CloudIcon}
            colorStops={[
              { at: 0, color: 'emerald' },
              { at: 30, color: 'yellow' },
              { at: 60, color: 'orange' },
              { at: 80, color: 'red' },
            ]}
          />
          <ThresholdSlider
            label="Humidity Danger Level"
            description="Relative humidity (%) below which fire danger increases"
            value={config.humidityDanger}
            min={5}
            max={50}
            step={1}
            unit="%"
            onChange={updateField('humidityDanger')}
            icon={CloudIcon}
            colorStops={[
              { at: 0, color: 'red' },
              { at: 40, color: 'yellow' },
              { at: 70, color: 'emerald' },
            ]}
          />
          <ThresholdSlider
            label="Drought Index Threshold"
            description="Keetch-Byram Drought Index threshold (scale 0–8)"
            value={config.droughtIndexThreshold}
            min={0}
            max={8}
            step={0.5}
            unit=""
            onChange={updateField('droughtIndexThreshold')}
            icon={SunIcon}
            colorStops={[
              { at: 0, color: 'emerald' },
              { at: 40, color: 'yellow' },
              { at: 65, color: 'orange' },
              { at: 80, color: 'red' },
            ]}
          />
        </div>
      </GlowCard>

      {/* ══════════════════════════════════════
         Section 3 — Spatial Settings
         ══════════════════════════════════════ */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <MapPinIcon className="w-5 h-5 text-purple-400" />
          Spatial Settings
        </h3>
        <p className="text-gray-500 text-sm mb-5">
          Geospatial alert parameters for proximity-based notifications.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ThresholdSlider
            label="Proximity Alert Radius"
            description="Radius (km) within which users receive location-based alerts"
            value={config.proximityAlertRadius}
            min={1}
            max={100}
            step={1}
            unit="km"
            onChange={updateField('proximityAlertRadius')}
            icon={MapPinIcon}
            colorStops={[
              { at: 0, color: 'blue' },
              { at: 50, color: 'orange' },
              { at: 80, color: 'red' },
            ]}
          />
        </div>
      </GlowCard>

      {/* ══════════════════════════════════════
         Section 4 — Alert & Notification
         ══════════════════════════════════════ */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <BellAlertIcon className="w-5 h-5 text-amber-400" />
          Alert &amp; Notification Settings
        </h3>
        <p className="text-gray-500 text-sm mb-5">
          Configure how and when alerts are dispatched to users.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ToggleSetting
            label="Automatic Alerts"
            description="Automatically generate alerts when predictions exceed thresholds"
            value={config.enableAutoAlerts}
            onChange={updateField('enableAutoAlerts')}
            icon={BellAlertIcon}
          />
          <ToggleSetting
            label="Evacuation Alerts"
            description="Include evacuation route suggestions in critical alerts"
            value={config.enableEvacuationAlerts}
            onChange={updateField('enableEvacuationAlerts')}
            icon={ShieldExclamationIcon}
          />
          <ToggleSetting
            label="Email Notifications"
            description="Send alert notifications via email to subscribed users"
            value={config.enableEmailNotifications}
            onChange={updateField('enableEmailNotifications')}
            icon={BellAlertIcon}
          />
          <ToggleSetting
            label="SMS Notifications"
            description="Send critical alerts via SMS (requires SMS provider)"
            value={config.enableSmsNotifications}
            onChange={updateField('enableSmsNotifications')}
            icon={BellAlertIcon}
          />
          <ThresholdSlider
            label="Alert Cooldown"
            description="Minimum minutes between duplicate alerts for the same region"
            value={config.alertCooldown}
            min={5}
            max={120}
            step={5}
            unit="min"
            onChange={updateField('alertCooldown')}
            icon={ClockIcon}
            colorStops={[
              { at: 0, color: 'red' },
              { at: 30, color: 'yellow' },
              { at: 60, color: 'emerald' },
            ]}
          />
          <ThresholdSlider
            label="Max Alerts Per Hour"
            description="Cap on the total number of alerts generated per hour"
            value={config.maxAlertsPerHour}
            min={1}
            max={100}
            step={1}
            unit=""
            onChange={updateField('maxAlertsPerHour')}
            icon={BellAlertIcon}
            colorStops={[
              { at: 0, color: 'emerald' },
              { at: 50, color: 'yellow' },
              { at: 80, color: 'red' },
            ]}
          />
        </div>
      </GlowCard>

      {/* ══════════════════════════════════════
         Section 5 — System Settings
         ══════════════════════════════════════ */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="w-5 h-5 text-cyan-400" />
          System Settings
        </h3>
        <p className="text-gray-500 text-sm mb-5">General platform configuration.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SelectSetting
            label="Prediction Refresh Interval"
            description="How often to refresh wildfire prediction data"
            value={config.predictionRefreshInterval}
            onChange={updateField('predictionRefreshInterval')}
            icon={ClockIcon}
            options={[
              { value: '5', label: 'Every 5 minutes' },
              { value: '15', label: 'Every 15 minutes' },
              { value: '30', label: 'Every 30 minutes' },
              { value: '60', label: 'Every hour' },
              { value: '360', label: 'Every 6 hours' },
            ]}
          />
          <ThresholdSlider
            label="Data Retention"
            description="Days to retain historical prediction and alert data"
            value={config.dataRetentionDays}
            min={30}
            max={730}
            step={30}
            unit=" days"
            onChange={updateField('dataRetentionDays')}
            icon={ClockIcon}
            colorStops={[
              { at: 0, color: 'blue' },
              { at: 50, color: 'emerald' },
            ]}
          />
          <ToggleSetting
            label="Maintenance Mode"
            description="Disable public access and display a maintenance page"
            value={config.enableMaintenanceMode}
            onChange={updateField('enableMaintenanceMode')}
            icon={ExclamationTriangleIcon}
          />
        </div>
      </GlowCard>

      {/* ══════════════════════════════════════
         Sticky Mobile Save Bar
         ══════════════════════════════════════ */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gray-900/95 border-t border-gray-800 backdrop-blur-sm sm:hidden animate-fade-in">
          <div className="flex gap-3 max-w-lg mx-auto">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl font-medium transition-colors hover:bg-gray-700"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}