import React, { useState } from 'react';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  MapPin,
  Wind,
  Thermometer,
  Droplets,
  Eye,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  Info,
  X,
} from 'lucide-react';

const INSIGHT_TYPES = {
  risk_change: {
    icon: Flame,
    gradient: 'from-red-500 to-orange-500',
    bgGlow: 'shadow-red-500/20',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
  },
  weather_alert: {
    icon: Wind,
    gradient: 'from-yellow-500 to-amber-500',
    bgGlow: 'shadow-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
  },
  prediction: {
    icon: TrendingUp,
    gradient: 'from-purple-500 to-indigo-500',
    bgGlow: 'shadow-purple-500/20',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
  },
  anomaly: {
    icon: Zap,
    gradient: 'from-cyan-500 to-blue-500',
    bgGlow: 'shadow-cyan-500/20',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
  },
  temperature: {
    icon: Thermometer,
    gradient: 'from-orange-500 to-red-500',
    bgGlow: 'shadow-orange-500/20',
    borderColor: 'border-orange-500/30',
    bgColor: 'bg-orange-500/10',
  },
  humidity: {
    icon: Droplets,
    gradient: 'from-blue-500 to-cyan-500',
    bgGlow: 'shadow-blue-500/20',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
  },
  location: {
    icon: MapPin,
    gradient: 'from-green-500 to-emerald-500',
    bgGlow: 'shadow-green-500/20',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
  },
  info: {
    icon: Info,
    gradient: 'from-gray-400 to-gray-500',
    bgGlow: 'shadow-gray-500/20',
    borderColor: 'border-gray-500/30',
    bgColor: 'bg-gray-500/10',
  },
};

const InsightCard = ({ data, compact = false, onDismiss, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const insightType = INSIGHT_TYPES[data?.type] || INSIGHT_TYPES.info;
  const Icon = insightType.icon;

  const getTrendIcon = (trend) => {
    if (!trend) return null;
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case 'down':
        return <ArrowDownRight className="w-4 h-4 text-green-400" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'moderate':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
    onDismiss?.(data?.id);
  };

  // Compact variant for inline display
  if (compact) {
    return (
      <button
        onClick={() => onClick?.(data)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] flex-shrink-0 ${insightType.borderColor} ${insightType.bgColor}`}
      >
        <div
          className={`p-1 rounded-md bg-gradient-to-br ${insightType.gradient}`}
        >
          <Icon className="w-3 h-3 text-white" />
        </div>
        <div className="text-left">
          <p className="text-xs font-medium text-gray-200 whitespace-nowrap">
            {data?.title || 'Insight'}
          </p>
          {data?.value && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">{data.value}</span>
              {getTrendIcon(data?.trend)}
            </div>
          )}
        </div>
      </button>
    );
  }

  // Full insight card
  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer group ${
        insightType.borderColor
      } ${insightType.bgColor} hover:shadow-lg ${insightType.bgGlow}`}
      onClick={() => {
        setIsExpanded(!isExpanded);
        onClick?.(data);
      }}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${insightType.gradient} blur-xl`}
        style={{ opacity: 0.05 }}
      />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl bg-gradient-to-br ${insightType.gradient} shadow-lg ${insightType.bgGlow} flex-shrink-0`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white truncate">
                  {data?.title || 'Insight'}
                </h4>
                {data?.severity && (
                  <span
                    className={`text-xs font-medium ${getSeverityColor(
                      data.severity
                    )}`}
                  >
                    {data.severity.toUpperCase()}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-0.5">
                {data?.subtitle || data?.region || 'Analysis result'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="p-1 text-gray-500 hover:text-gray-300 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronRight
              className={`w-4 h-4 text-gray-500 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </div>

        {/* Value Display */}
        {data?.value && (
          <div className="mt-3 flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{data.value}</span>
            {data?.unit && (
              <span className="text-sm text-gray-400 mb-1">{data.unit}</span>
            )}
            {data?.change && (
              <div
                className={`flex items-center gap-0.5 mb-1 ${
                  data.change > 0 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {data.change > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {data.change > 0 ? '+' : ''}
                  {data.change}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {data?.description && (
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Expanded Details */}
        {isExpanded && data?.details && (
          <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-2 animate-fadeIn">
            {Array.isArray(data.details) ? (
              data.details.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{detail.label}</span>
                  <span className="text-gray-200 font-medium">{detail.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-300">{data.details}</p>
            )}

            {/* Actions */}
            {data?.actions && data.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {data.actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.handler?.();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      idx === 0
                        ? `bg-gradient-to-r ${insightType.gradient} text-white`
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mini Sparkline */}
        {data?.sparkline && data.sparkline.length > 0 && (
          <div className="mt-3 h-8">
            <svg
              viewBox={`0 0 ${data.sparkline.length * 10} 32`}
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id={`sparkline-${data?.id || 'default'}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={generateSparklinePath(data.sparkline, data.sparkline.length * 10, 32)}
                fill={`url(#sparkline-${data?.id || 'default'})`}
                className="text-orange-500"
              />
              <path
                d={generateSparklineLinePath(
                  data.sparkline,
                  data.sparkline.length * 10,
                  32
                )}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-orange-400"
              />
            </svg>
          </div>
        )}

        {/* Timestamp */}
        {data?.timestamp && (
          <p className="mt-2 text-xs text-gray-500">
            {new Date(data.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

// Helper functions for sparkline
function generateSparklineLinePath(data, width, height) {
  if (!data || data.length === 0) return '';
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  return data
    .map((val, i) => {
      const x = i * step;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function generateSparklinePath(data, width, height) {
  const linePath = generateSparklineLinePath(data, width, height);
  if (!linePath) return '';
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

export default InsightCard;