import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Easing functions for smooth animations.
 */
const EASING = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  spring: (t) => 1 - Math.pow(Math.cos(t * Math.PI * 0.5), 3),
};

/**
 * Compact number formatter – turns 1234567 → "1.23M"
 */
function compactNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) {
    return (0).toFixed(decimals);
  }
  const thresholds = [
    { suffix: 'T', value: 1e12 },
    { suffix: 'B', value: 1e9 },
    { suffix: 'M', value: 1e6 },
    { suffix: 'K', value: 1e3 },
  ];
  for (const { suffix, value } of thresholds) {
    if (Math.abs(num) >= value) {
      return (num / value).toFixed(decimals) + suffix;
    }
  }
  return num.toFixed(decimals);
}

export default function AnimatedCounter({
  value = 0,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  compact = false,
  easing = 'easeOut',
  separator = true,
  className = '',
  highlightChange = true,
  startOnView = true,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [highlight, setHighlight] = useState(false);
  const prevValue = useRef(0);
  const frameRef = useRef(null);
  const containerRef = useRef(null);
  const hasAnimated = useRef(false);

  const animate = useCallback(
    (from, to) => {
      const start = performance.now();
      const easeFn = EASING[easing] || EASING.easeOut;

      const step = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeFn(progress);
        const current = from + (to - from) * easedProgress;

        setDisplayValue(current);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step);
        }
      };

      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(step);
    },
    [duration, easing]
  );

  // Intersection Observer – animate when visible
  useEffect(() => {
    if (!startOnView) {
      hasAnimated.current = true;
      animate(0, value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate(0, value);
        }
      },
      { threshold: 0.3 }
    );

    const el = containerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Re-animate on value change (after first mount)
  useEffect(() => {
    if (!hasAnimated.current) return;
    if (prevValue.current === value) return;

    animate(prevValue.current, value);

    if (highlightChange && prevValue.current !== 0) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 600);
      return () => clearTimeout(timer);
    }

    prevValue.current = value;
  }, [value, animate, highlightChange]);

  // Cleanup
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // Format the display value
  const formatted = compact
    ? compactNumber(displayValue, decimals)
    : Number(displayValue)
        .toFixed(decimals)
        .replace(separator ? /\B(?=(\d{3})+(?!\d))/g : /(?!)/g, ',');

  return (
    <span
      ref={containerRef}
      className={`
        inline-flex items-baseline font-mono tabular-nums tracking-tight
        transition-colors duration-300
        ${highlight ? 'text-orange-400' : ''}
        ${className}
      `}
      aria-live="polite"
      aria-atomic="true"
    >
      {prefix && <span className="mr-0.5">{prefix}</span>}
      <span>{formatted}</span>
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
}