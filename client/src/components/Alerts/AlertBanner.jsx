// client/src/components/Alerts/AlertBanner.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  FireIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  ShieldExclamationIcon,
  MapPinIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';
import { useWebSocket } from '../../hooks/useWebSocket';

// ── severity config ──────────────────────────────────────────────
const SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-gradient-to-r from-red-900/95 via-red-800/95 to-red-900/95',
    border: 'border-red-500/60',
    icon: FireIcon,
    iconColor: 'text-red-300',
    textColor: 'text-red-50',
    subtextColor: 'text-red-200',
    badge: 'bg-red-500/30 text-red-100 border-red-400/50',
    pulse: 'animate-pulse',
    glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]',
    progressBar: 'bg-red-400',
    dotColor: 'bg-red-400',
  },
  high: {
    bg: 'bg-gradient-to-r from-orange-900/95 via-orange-800/95 to-orange-900/95',
    border: 'border-orange-500/60',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-orange-300',
    textColor: 'text-orange-50',
    subtextColor: 'text-orange-200',
    badge: 'bg-orange-500/30 text-orange-100 border-orange-400/50',
    pulse: '',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]',
    progressBar: 'bg-orange-400',
    dotColor: 'bg-orange-400',
  },
  moderate: {
    bg: 'bg-gradient-to-r from-amber-900/95 via-amber-800/95 to-amber-900/95',
    border: 'border-amber-500/60',
    icon: ShieldExclamationIcon,
    iconColor: 'text-amber-300',
    textColor: 'text-amber-50',
    subtextColor: 'text-amber-200',
    badge: 'bg-amber-500/30 text-amber-100 border-amber-400/50',
    pulse: '',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    progressBar: 'bg-amber-400',
    dotColor: 'bg-amber-400',
  },
  low: {
    bg: 'bg-gradient-to-r from-blue-900/95 via-blue-800/95 to-blue-900/95',
    border: 'border-blue-500/60',
    icon: MegaphoneIcon,
    iconColor: 'text-blue-300',
    textColor: 'text-blue-50',
    subtextColor: 'text-blue-200',
    badge: 'bg-blue-500/30 text-blue-100 border-blue-400/50',
    pulse: '',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    progressBar: 'bg-blue-400',
    dotColor: 'bg-blue-400',
  },
};

// ── time‑ago helper ──────────────────────────────────────────────
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// ── auto‑rotate interval (ms) ───────────────────────────────────
const AUTO_ROTATE_INTERVAL = 6000;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const EMPTY_ARRAY = [];
const AlertBanner = ({ alerts: propAlerts = EMPTY_ARRAY, onDismiss, onViewDetails }) => {
  const [activeAlerts, setActiveAlerts] = useState(propAlerts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  // ── WebSocket live alerts ────────────────────────────────────
  const { lastMessage } = useWebSocket('/alerts', {
    onMessage: (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'NEW_ALERT') {
          setActiveAlerts((prev) => {
            const exists = prev.find((a) => a._id === data.alert._id);
            if (exists) return prev;
            return [data.alert, ...prev];
          });
        }
        if (data.type === 'ALERT_RESOLVED') {
          setActiveAlerts((prev) => prev.filter((a) => a._id !== data.alertId));
        }
      } catch {
        /* ignore malformed */
      }
    },
  });

  // ── Merge prop alerts ────────────────────────────────────────
  useEffect(() => {
    setActiveAlerts((prev) => {
      const ids = new Set(prev.map((a) => a._id));
      const merged = [...prev];
      propAlerts.forEach((a) => {
        if (!ids.has(a._id)) merged.push(a);
      });
      return merged;
    });
  }, [propAlerts]);

  // ── Filter dismissed ─────────────────────────────────────────
  const visibleAlerts = activeAlerts.filter((a) => !dismissedIds.has(a._id));

  // ── Auto‑rotate timer ────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    setProgress(0);
    const step = 50; // ms
    let elapsed = 0;

    progressRef.current = setInterval(() => {
      elapsed += step;
      setProgress((elapsed / AUTO_ROTATE_INTERVAL) * 100);
    }, step);

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) =>
        visibleAlerts.length > 0 ? (prev + 1) % visibleAlerts.length : 0
      );
      elapsed = 0;
      setProgress(0);
    }, AUTO_ROTATE_INTERVAL);
  }, [visibleAlerts.length]);

  useEffect(() => {
    if (!isHovered && visibleAlerts.length > 1) {
      startTimer();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isHovered, startTimer, visibleAlerts.length]);

  // ── Keep index in bounds ─────────────────────────────────────
  useEffect(() => {
    if (currentIndex >= visibleAlerts.length) {
      setCurrentIndex(Math.max(0, visibleAlerts.length - 1));
    }
  }, [visibleAlerts.length, currentIndex]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleDismiss = (alertId) => {
    setDismissedIds((prev) => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? visibleAlerts.length - 1 : prev - 1
    );
    setProgress(0);
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === visibleAlerts.length - 1 ? 0 : prev + 1
    );
    setProgress(0);
  };

  // ── Nothing to show ──────────────────────────────────────────
  if (visibleAlerts.length === 0) return null;

  const currentAlert = visibleAlerts[currentIndex];
  if (!currentAlert) return null;

  const severity = currentAlert.severity || 'moderate';
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.moderate;
  const SeverityIcon = cfg.icon;

  // ── Render ───────────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentAlert._id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className={`relative overflow-hidden rounded-xl border ${cfg.border} ${cfg.bg} ${cfg.glow} ${cfg.pulse}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* progress bar */}
        {visibleAlerts.length > 1 && (
          <div className="absolute top-0 left-0 h-0.5 w-full bg-white/10">
            <motion.div
              className={`h-full ${cfg.progressBar}`}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        )}

        <div className="relative flex items-center gap-4 px-4 py-3 sm:px-6 sm:py-4">
          {/* icon */}
          <div className="flex-shrink-0">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm`}
            >
              <SeverityIcon className={`h-6 w-6 ${cfg.iconColor}`} />
            </div>
          </div>

          {/* body */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}
              >
                {severity}
              </span>
              <h4 className={`text-sm font-semibold truncate ${cfg.textColor}`}>
                {currentAlert.title || 'Wildfire Alert'}
              </h4>
            </div>

            <p className={`mt-0.5 text-xs leading-snug ${cfg.subtextColor} line-clamp-2`}>
              {currentAlert.message || currentAlert.description}
            </p>

            {/* meta */}
            <div className={`mt-1.5 flex items-center gap-3 text-[11px] ${cfg.subtextColor}`}>
              {currentAlert.region && (
                <span className="flex items-center gap-1">
                  <MapPinIcon className="h-3 w-3" />
                  {currentAlert.region.name || currentAlert.region}
                </span>
              )}
              {currentAlert.createdAt && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {timeAgo(currentAlert.createdAt)}
                </span>
              )}
            </div>
          </div>

          {/* actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(currentAlert)}
                className={`rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium ${cfg.textColor} backdrop-blur-sm transition hover:bg-white/20`}
              >
                View
              </button>
            )}

            <button
              onClick={() => handleDismiss(currentAlert._id)}
              className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* navigation */}
        {visibleAlerts.length > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-1.5 sm:px-6">
            <button
              onClick={handlePrev}
              className="rounded p-0.5 text-white/50 transition hover:text-white"
              aria-label="Previous alert"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {visibleAlerts.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setProgress(0);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? `w-4 ${cfg.dotColor}`
                      : 'w-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to alert ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="rounded p-0.5 text-white/50 transition hover:text-white"
              aria-label="Next alert"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default AlertBanner;