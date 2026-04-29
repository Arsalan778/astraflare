import { useRef, useState, useCallback } from 'react';

const GLOW_COLORS = {
  orange: {
    border: 'border-orange-500/20',
    hoverBorder: 'hover:border-orange-500/40',
    glow: 'from-orange-500/20 via-transparent to-transparent',
    shadow: 'hover:shadow-orange-500/10',
  },
  red: {
    border: 'border-red-500/20',
    hoverBorder: 'hover:border-red-500/40',
    glow: 'from-red-500/20 via-transparent to-transparent',
    shadow: 'hover:shadow-red-500/10',
  },
  amber: {
    border: 'border-amber-500/20',
    hoverBorder: 'hover:border-amber-500/40',
    glow: 'from-amber-500/20 via-transparent to-transparent',
    shadow: 'hover:shadow-amber-500/10',
  },
  green: {
    border: 'border-green-500/20',
    hoverBorder: 'hover:border-green-500/40',
    glow: 'from-green-500/20 via-transparent to-transparent',
    shadow: 'hover:shadow-green-500/10',
  },
  blue: {
    border: 'border-blue-500/20',
    hoverBorder: 'hover:border-blue-500/40',
    glow: 'from-blue-500/20 via-transparent to-transparent',
    shadow: 'hover:shadow-blue-500/10',
  },
  purple: {
    border: 'border-purple-500/20',
    hoverBorder: 'hover:border-purple-500/40',
    glow: 'from-purple-500/20 via-transparent to-transparent',
    shadow: 'hover:shadow-purple-500/10',
  },
  neutral: {
    border: 'border-gray-700/50',
    hoverBorder: 'hover:border-gray-600',
    glow: 'from-white/5 via-transparent to-transparent',
    shadow: 'hover:shadow-gray-500/5',
  },
};

const PADDING_MAP = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8',
};

export default function GlowCard({
  children,
  color = 'orange',
  padding = 'md',
  header,
  footer,
  interactive = true,
  onClick,
  href,
  disabled = false,
  className = '',
  glowIntensity = 1,     // 0 – 2
  as: Component = 'div',
  hoverGlow,
  ...rest
}) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const palette = GLOW_COLORS[color] || GLOW_COLORS.orange;
  const pad = PADDING_MAP[padding] || PADDING_MAP.md;

  /* ---- mouse-follow glow ---- */
  const handleMouseMove = useCallback(
    (e) => {
      if (!interactive || disabled || !glowRef.current || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      glowRef.current.style.background = `radial-gradient(
        320px circle at ${x}px ${y}px,
        rgba(251,146,60,${0.08 * glowIntensity}),
        transparent 60%
      )`;
    },
    [interactive, disabled, glowIntensity]
  );

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (glowRef.current) glowRef.current.style.background = 'transparent';
  };

  /* ---- clickable semantics ---- */
  const isClickable = !disabled && (onClick || href);
  const Tag = href ? 'a' : Component;
  const linkProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Tag
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`
        relative group
        rounded-2xl border
        bg-gray-900/70 backdrop-blur-md
        overflow-hidden
        transition-all duration-300
        ${palette.border}
        ${interactive && !disabled ? palette.hoverBorder : ''}
        ${interactive && !disabled ? `${palette.shadow} hover:shadow-xl` : ''}
        ${isClickable ? 'cursor-pointer' : ''}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
      {...linkProps}
      {...rest}
    >
      {/* Mouse-follow glow */}
      {interactive && (
        <div
          ref={glowRef}
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{ opacity: isHovered ? 1 : 0 }}
          aria-hidden
        />
      )}

      {/* Top ambient glow gradient */}
      {interactive && (
        <div
          className={`
            pointer-events-none absolute -top-px -left-px -right-px h-px
            bg-gradient-to-r ${palette.glow}
            opacity-0 group-hover:opacity-100
            transition-opacity duration-500
          `}
          aria-hidden
        />
      )}

      {/* Header */}
      {header && (
        <div className="relative z-10 px-5 py-3 border-b border-gray-800/60">
          {typeof header === 'string' ? (
            <h3 className="text-sm font-semibold text-gray-200 tracking-wide">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}

      {/* Body */}
      <div className={`relative z-10 ${pad}`}>{children}</div>

      {/* Footer */}
      {footer && (
        <div className="relative z-10 px-5 py-3 border-t border-gray-800/60 bg-gray-900/40">
          {footer}
        </div>
      )}
    </Tag>
  );
}