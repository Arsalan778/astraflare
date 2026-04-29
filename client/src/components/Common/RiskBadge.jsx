import { useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  FireIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

const RISK_CONFIG = {
  critical: {
    label: 'Critical',
    icon: XCircleIcon,
    bg: 'bg-red-500/15',
    border: 'border-red-500/40',
    text: 'text-red-400',
    glow: 'shadow-red-500/20',
    dot: 'bg-red-500',
    pulse: true,
    barPercent: 100,
    barColor: 'bg-gradient-to-r from-red-600 to-red-400',
  },
  extreme: {
    label: 'Extreme',
    icon: FireIcon,
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/20',
    dot: 'bg-orange-500',
    pulse: true,
    barPercent: 85,
    barColor: 'bg-gradient-to-r from-orange-600 to-orange-400',
  },
  high: {
    label: 'High',
    icon: ExclamationTriangleIcon,
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/15',
    dot: 'bg-amber-500',
    pulse: false,
    barPercent: 70,
    barColor: 'bg-gradient-to-r from-amber-600 to-amber-400',
  },
  moderate: {
    label: 'Moderate',
    icon: ShieldExclamationIcon,
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
    glow: 'shadow-yellow-500/10',
    dot: 'bg-yellow-500',
    pulse: false,
    barPercent: 50,
    barColor: 'bg-gradient-to-r from-yellow-600 to-yellow-400',
  },
  low: {
    label: 'Low',
    icon: ShieldCheckIcon,
    bg: 'bg-green-500/15',
    border: 'border-green-500/40',
    text: 'text-green-400',
    glow: 'shadow-green-500/10',
    dot: 'bg-green-500',
    pulse: false,
    barPercent: 25,
    barColor: 'bg-gradient-to-r from-green-600 to-green-400',
  },
  minimal: {
    label: 'Minimal',
    icon: ShieldCheckIcon,
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    glow: '',
    dot: 'bg-blue-500',
    pulse: false,
    barPercent: 10,
    barColor: 'bg-gradient-to-r from-blue-600 to-blue-400',
  },
  none: {
    label: 'None',
    icon: ShieldCheckIcon,
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/40',
    text: 'text-slate-400',
    glow: '',
    dot: 'bg-slate-500',
    pulse: false,
    barPercent: 0,
    barColor: 'bg-slate-500',
  },
  unknown: {
    label: 'Unknown',
    icon: ShieldCheckIcon,
    bg: 'bg-gray-500/15',
    border: 'border-gray-500/40',
    text: 'text-gray-400',
    glow: '',
    dot: 'bg-gray-500',
    pulse: false,
    barPercent: 0,
    barColor: 'bg-gray-500',
  },
};

function resolveLevel(level, score) {
  if (level && RISK_CONFIG[level.toLowerCase()]) return level.toLowerCase();
  if (typeof score === 'number') {
    const s = score <= 1 ? score * 100 : score;
    if (s >= 90) return 'critical';
    if (s >= 75) return 'extreme';
    if (s >= 55) return 'high';
    if (s >= 30) return 'moderate';
    if (s >= 10) return 'low';
    if (s >= 0) return 'minimal';
  }
  return 'none';
}

const SIZE_PRESETS = {
  xs: { wrapper: 'px-1.5 py-0.5 text-[10px]', icon: 'w-3 h-3', dot: 'w-1.5 h-1.5' },
  sm: { wrapper: 'px-2 py-0.5 text-xs', icon: 'w-3.5 h-3.5', dot: 'w-1.5 h-1.5' },
  md: { wrapper: 'px-2.5 py-1 text-sm', icon: 'w-4 h-4', dot: 'w-2 h-2' },
  lg: { wrapper: 'px-3 py-1.5 text-base', icon: 'w-5 h-5', dot: 'w-2.5 h-2.5' },
};

export default function RiskBadge({
  level,
  score,
  size = 'md',
  showIcon = true,
  showBar = false,
  showScore = false,
  animated = true,
  className = '',
  onClick,
}) {
  const resolvedLevel = useMemo(() => resolveLevel(level, score), [level, score]);
  const config = RISK_CONFIG[resolvedLevel];
  const sizePreset = SIZE_PRESETS[size] || SIZE_PRESETS.md;
  const IconComponent = config.icon;

  const barWidthPercent = typeof score === 'number' ? Math.min(100, Math.max(0, score)) : config.barPercent;

  return (
    <div
      className={`inline-flex flex-col gap-1 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span
        className={`
          inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide
          border backdrop-blur-sm select-none
          ${sizePreset.wrapper}
          ${config.bg} ${config.border} ${config.text}
          ${config.glow ? `shadow-lg ${config.glow}` : ''}
          transition-all duration-200
          ${onClick ? 'hover:brightness-125 active:scale-95' : ''}
        `}
      >
        {config.pulse && animated && (
          <span className="relative flex">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.dot}`}
            />
            <span className={`relative inline-flex rounded-full ${sizePreset.dot} ${config.dot}`} />
          </span>
        )}

        {showIcon && <IconComponent className={sizePreset.icon} />}
        <span>{config.label}</span>

        {showScore && typeof score === 'number' && (
          <span className="ml-0.5 opacity-80 font-mono">{Math.round(score)}</span>
        )}
      </span>

      {showBar && (
        <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${config.barColor} ${animated ? 'transition-all duration-700 ease-out' : ''}`}
            style={{ width: `${barWidthPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

RiskBadge.resolveLevel = resolveLevel;
RiskBadge.RISK_CONFIG = RISK_CONFIG;