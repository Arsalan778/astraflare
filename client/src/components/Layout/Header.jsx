import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  MapPin,
  ChevronDown,
  Wifi,
  WifiOff,
  X,
  Sun,
  Moon,
  Maximize,
} from 'lucide-react';
import useGeolocation from '../../hooks/useGeolocation';
import useDebounce from '../../hooks/useDebounce';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/map': 'Live Fire Map',
  '/predictions': 'Risk Predictions',
  '/pyrosage': 'PyroSage AI',
  '/alerts': 'Alerts Center',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
};

const EMPTY_ARRAY = [];

export default function Header({ onMenuToggle, sidebarCollapsed }) {
  const { user } = useSelector((state) => state.auth);
  const alerts = useSelector((state) => state.prediction?.activeAlerts || EMPTY_ARRAY);
  const location = useLocation();
  const navigate = useNavigate();
  const { coords, locationName } = useGeolocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const unreadCount = alerts.filter((a) => !a.read).length;
  const pageTitle = PAGE_TITLES[location.pathname] || 'AstraFlare';

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  const riskLevelColor = (level) => {
    const colors = {
      extreme: 'bg-purple-500',
      very_high: 'bg-red-500',
      high: 'bg-orange-500',
      moderate: 'bg-amber-500',
      low: 'bg-emerald-500',
    };
    return colors[level] || 'bg-slate-500';
  };

  return (
    <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-white leading-tight">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {coords && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} className="text-orange-500" />
                  {locationName || `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`}
                </span>
              )}
              <span className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi size={10} className="text-emerald-500" />
                ) : (
                  <WifiOff size={10} className="text-red-500" />
                )}
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            {searchOpen ? (
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <Search size={16} className="text-slate-400 ml-3" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search regions, predictions..."
                  className="w-48 md:w-64 bg-transparent border-none text-sm text-white placeholder-slate-500 px-2 py-2 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearchOpen(false);
                      setSearchQuery('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Search (Ctrl+K)"
              >
                <Search size={18} />
              </button>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="hidden md:flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle fullscreen"
          >
            <Maximize size={18} />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                  {alerts.length > 0 ? (
                    alerts.slice(0, 10).map((alert) => (
                      <div
                        key={alert._id || alert.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 transition-colors
                          ${!alert.read ? 'bg-slate-750/30' : ''}`}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/alerts');
                        }}
                      >
                        <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${riskLevelColor(alert.severity)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 line-clamp-2">
                            {alert.message || alert.title}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatTimestamp(alert.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      No notifications
                    </div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-slate-700">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/alerts');
                    }}
                    className="w-full text-center text-xs text-orange-400 hover:text-orange-300 py-1 transition-colors"
                  >
                    View all alerts →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User avatar (visible on desktop) */}
          <div className="hidden md:flex items-center gap-2 ml-2 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200 leading-tight">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <span className="text-[10px] text-slate-500 capitalize">
                {user?.role || 'viewer'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}