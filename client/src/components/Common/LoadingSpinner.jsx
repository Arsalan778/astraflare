import { useState, useEffect } from 'react';

const SIZE_MAP = {
  xs: { container: 'w-4 h-4', ring: 'w-4 h-4', border: 'border-2', text: 'text-xs' },
  sm: { container: 'w-6 h-6', ring: 'w-6 h-6', border: 'border-2', text: 'text-sm' },
  md: { container: 'w-10 h-10', ring: 'w-10 h-10', border: 'border-3', text: 'text-base' },
  lg: { container: 'w-16 h-16', ring: 'w-16 h-16', border: 'border-4', text: 'text-lg' },
  xl: { container: 'w-24 h-24', ring: 'w-24 h-24', border: 'border-4', text: 'text-xl' },
};

const VARIANT_STYLES = {
  default: {
    ring: 'border-gray-700 border-t-orange-500',
    glow: 'shadow-orange-500/20',
    text: 'text-gray-400',
  },
  fire: {
    ring: 'border-gray-700 border-t-red-500 border-r-orange-500',
    glow: 'shadow-red-500/30',
    text: 'text-orange-400',
  },
  pulse: {
    ring: 'border-gray-700 border-t-amber-400',
    glow: 'shadow-amber-400/25',
    text: 'text-amber-400',
  },
  minimal: {
    ring: 'border-transparent border-t-gray-400',
    glow: '',
    text: 'text-gray-500',
  },
};

export default function LoadingSpinner({
  size = 'md',
  variant = 'default',
  label = '',
  fullScreen = false,
  overlay = false,
  className = '',
}) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!label) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [label]);

  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;
  const variantConfig = VARIANT_STYLES[variant] || VARIANT_STYLES.default;

  const spinner = (
    <div className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Spinner ring */}
      <div className="relative">
        {/* Outer glow */}
        {variant !== 'minimal' && (
          <div
            className={`absolute inset-0 ${sizeConfig.ring} rounded-full blur-md opacity-50 ${variantConfig.glow}`}
          />
        )}

        {/* Primary ring */}
        <div
          className={`
            ${sizeConfig.ring}
            ${sizeConfig.border}
            ${variantConfig.ring}
            rounded-full
            animate-spin
            relative
          `}
          role="status"
          aria-label={label || 'Loading'}
        />

        {/* Inner pulse for fire variant */}
        {variant === 'fire' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          </div>
        )}

        {/* Concentric ring for pulse variant */}
        {variant === 'pulse' && (
          <div
            className={`
              absolute inset-0
              ${sizeConfig.ring}
              rounded-full
              border
              border-amber-400/30
              animate-ping
            `}
          />
        )}
      </div>

      {/* Label */}
      {label && (
        <span className={`${sizeConfig.text} ${variantConfig.text} font-medium tracking-wide`}>
          {label}
          <span className="inline-block w-4 text-left">{dots}</span>
        </span>
      )}
    </div>
  );

  // Full-screen overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/90 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  // Section overlay
  if (overlay) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm rounded-xl">
        {spinner}
      </div>
    );
  }

  return spinner;
}