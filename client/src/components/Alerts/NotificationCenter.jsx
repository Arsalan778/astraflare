// client/src/components/Alerts/NotificationCenter.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellIcon,
  BellAlertIcon,
  XMarkIcon,
  CheckIcon,
  CheckCircleIcon,
  TrashIcon,
  Cog6ToothIcon,
  FireIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  MegaphoneIcon,
  InformationCircleIcon,
  MapPinIcon,
  ClockIcon,
  FunnelIcon,
  BellSlashIcon,
} from '@heroicons/react/24/solid';
import { useWebSocket } from '../../hooks/useWebSocket';
import api from '../../api/axios';

// ── notification type config ─────────────────────────────────────
const TYPE_CONFIG = {
  critical_alert: {
    icon: FireIcon,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Critical Alert',
  },
  high_alert: {
    icon: ExclamationTriangleIcon,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    label: 'High Alert',
  },
  moderate_alert: {
    icon: ShieldExclamationIcon,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    label: 'Moderate Alert',
  },
  low_alert: {
    icon: MegaphoneIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    label: 'Low Alert',
  },
  prediction: {
    icon: ShieldExclamationIcon,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    label: 'Prediction',
  },
  system: {
    icon: InformationCircleIcon,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    label: 'System',
  },
  report: {
    icon: InformationCircleIcon,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    label: 'Report',
  },
};

const fallbackType = TYPE_CONFIG.system;

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
};

// ── single notification item ─────────────────────────────────────
const NotificationItem = ({ notification, onRead, onDelete, onClick }) => {
  const cfg = TYPE_CONFIG[notification.type] || fallbackType;
  const Icon = cfg.icon;
  const isRead = notification.read;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={`group relative flex gap-3 rounded-lg p-3 transition cursor-pointer ${
        isRead ? 'bg-transparent hover:bg-slate-800/40' : `${cfg.bg} hover:brightness-110`
      }`}
      onClick={() => onClick?.(notification)}
    >
      {/* unread dot */}
      {!isRead && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-orange-400" />
      )}

      {/* icon */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          isRead ? 'bg-slate-800' : 'bg-white/10'
        }`}
      >
        <Icon className={`h-4 w-4 ${isRead ? 'text-slate-500' : cfg.color}`} />
      </div>

      {/* body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              isRead ? 'text-slate-600' : cfg.color
            }`}
          >
            {cfg.label}
          </span>
          <span className="whitespace-nowrap text-[10px] text-slate-600">
            {timeAgo(notification.createdAt)}
          </span>
        </div>

        <p
          className={`mt-0.5 text-xs leading-relaxed ${
            isRead ? 'text-slate-500' : 'text-slate-200'
          } line-clamp-2`}
        >
          {notification.title || notification.message}
        </p>

        {notification.region && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500">
            <MapPinIcon className="h-2.5 w-2.5" /> {notification.region}
          </span>
        )}
      </div>

      {/* hover actions */}
      <div className="absolute right-2 top-2 hidden items-center gap-0.5 group-hover:flex">
        {!isRead && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification._id);
            }}
            className="rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
            title="Mark as read"
          >
            <CheckIcon className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
          className="rounded p-1 text-slate-500 transition hover:bg-red-500/20 hover:text-red-400"
          title="Delete"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NotificationCenter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const NotificationCenter = ({ onNotificationClick, onSettingsClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all | unread | alerts | system
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef(null);

  // ── preferences (persisted in localStorage) ──────────────────
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('notifPrefs')) || {
        sound: true,
        desktop: true,
        critical: true,
        high: true,
        moderate: true,
        low: false,
        system: true,
      };
    } catch {
      return { sound: true, desktop: true, critical: true, high: true, moderate: true, low: false, system: true };
    }
  });

  useEffect(() => {
    localStorage.setItem('notifPrefs', JSON.stringify(preferences));
  }, [preferences]);

  // ── fetch notifications ──────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/alerts/notifications');
      setNotifications(data.notifications || data || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── WebSocket live push ──────────────────────────────────────
  useWebSocket('/notifications', {
    onMessage: (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type === 'NOTIFICATION') {
          setNotifications((prev) => [data.notification, ...prev]);

          // desktop notification
          if (preferences.desktop && Notification?.permission === 'granted') {
            new Notification(data.notification.title || 'AstraFlare Alert', {
              body: data.notification.message,
              icon: '/favicon.svg',
            });
          }

          // sound
          if (preferences.sound) {
            try {
              const audio = new Audio('/sounds/alert.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {
              /* noop */
            }
          }
        }
      } catch {
        /* noop */
      }
    },
  });

  // ── close on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ── derived data ─────────────────────────────────────────────
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'alerts':
        return notifications.filter((n) =>
          ['critical_alert', 'high_alert', 'moderate_alert', 'low_alert'].includes(n.type)
        );
      case 'system':
        return notifications.filter((n) => ['system', 'report', 'prediction'].includes(n.type));
      default:
        return notifications;
    }
  }, [notifications, filter]);

  // ── actions ──────────────────────────────────────────────────
  const markRead = async (id) => {
    try {
      await api.patch(`/alerts/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {
      /* noop */
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/alerts/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* noop */
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/alerts/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch {
      /* noop */
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/alerts/notifications');
      setNotifications([]);
    } catch {
      /* noop */
    }
  };

  const requestDesktopPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPreferences((p) => ({ ...p, desktop: false }));
      }
    }
  };

  useEffect(() => {
    if (preferences.desktop) requestDesktopPermission();
  }, [preferences.desktop]);

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="relative" ref={panelRef}>
      {/* ── Trigger Button ────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-5 w-5 animate-[wiggle_0.3s_ease-in-out]" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}

        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* ── Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 z-50 w-[380px] max-h-[520px] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/95 shadow-2xl backdrop-blur-xl"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                    title="Mark all as read"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowSettings((p) => !p)}
                  className={`rounded-lg p-1.5 transition ${
                    showSettings
                      ? 'bg-slate-800 text-orange-400'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Settings"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* settings pane */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-700/50"
                >
                  <div className="space-y-2 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Notification Preferences
                    </p>
                    {[
                      { key: 'sound', label: 'Alert Sound' },
                      { key: 'desktop', label: 'Desktop Notifications' },
                      { key: 'critical', label: 'Critical Alerts' },
                      { key: 'high', label: 'High Alerts' },
                      { key: 'moderate', label: 'Moderate Alerts' },
                      { key: 'low', label: 'Low Alerts' },
                      { key: 'system', label: 'System Messages' },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800/50"
                      >
                        {label}
                        <button
                          onClick={() =>
                            setPreferences((p) => ({ ...p, [key]: !p[key] }))
                          }
                          className={`relative h-5 w-9 rounded-full transition ${
                            preferences[key] ? 'bg-orange-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              preferences[key] ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </label>
                    ))}

                    <button
                      onClick={clearAll}
                      className="mt-1 w-full rounded-lg border border-red-500/30 bg-red-500/10 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                    >
                      Clear All Notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* filter tabs */}
            <div className="flex gap-1 border-b border-slate-700/50 px-4 py-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'alerts', label: 'Alerts' },
                { key: 'system', label: 'System' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                    filter === key
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* notification list */}
            <div className="max-h-[340px] overflow-y-auto overscroll-contain px-2 py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-orange-400" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <BellSlashIcon className="h-10 w-10 mb-2" />
                  <p className="text-xs font-medium">No notifications</p>
                  <p className="text-[10px] mt-0.5">
                    {filter === 'unread' ? "You're all caught up!" : 'Nothing here yet.'}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filtered.map((notif) => (
                    <NotificationItem
                      key={notif._id}
                      notification={notif}
                      onRead={markRead}
                      onDelete={deleteNotification}
                      onClick={(n) => {
                        if (!n.read) markRead(n._id);
                        onNotificationClick?.(n);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            

            {/* footer */}
            {filtered.length > 0 && (
              <div className="border-t border-slate-700/50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-600">
                  {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
                  {filter === 'unread' && unreadCount > 0 && ` · ${unreadCount} unread`}
                </span>

                <div className="flex items-center gap-2">
                  {onSettingsClick && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onSettingsClick();
                      }}
                      className="text-[10px] font-medium text-slate-500 transition hover:text-orange-400"
                    >
                      Alert Settings
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // Navigate to full alerts page — you can replace with
                      // react-router navigate('/alerts') if preferred
                      window.location.href = '/alerts';
                    }}
                    className="text-[10px] font-medium text-orange-400 transition hover:text-orange-300"
                  >
                    View All →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;