import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard,
  Map,
  BrainCircuit,
  MessageSquare,
  Bell,
  FileBarChart,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Flame,
  LogOut,
  User,
  Users,
  X,
} from 'lucide-react';

import { logout } from '../../store/authSlice';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/map', icon: Map, label: 'Live Map' },
  { to: '/predictions', icon: BrainCircuit, label: 'Predictions' },
  { to: '/pyrosage', icon: MessageSquare, label: 'PyroSage AI' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/members', icon: Users, label: 'Team Members' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];


const ADMIN_ITEMS = [
  { to: '/admin', icon: Shield, label: 'Admin Panel' },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const allItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

  const linkClasses = ({ isActive }) =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
    ${
      isActive
        ? 'bg-orange-500/15 text-orange-400 shadow-[inset_0_0_20px_rgba(251,146,60,0.05)]'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    }`;

  const renderNav = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
      {allItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={linkClasses}
          onClick={() => setMobileOpen?.(false)}
          title={collapsed ? item.label : undefined}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-orange-500 rounded-r-full" />
              )}
              <item.icon
                size={20}
                className={`shrink-0 transition-colors ${isActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-300'}`}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {!collapsed && item.to === '/alerts' && user?.unreadAlerts > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {user.unreadAlerts > 99 ? '99+' : user.unreadAlerts}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const renderLogo = () => (
    <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/80">
      <div className="relative shrink-0">
        <Flame size={28} className="text-orange-500" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent leading-tight">
            AstraFlare
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            Wildfire Intel
          </span>
          <div className="mt-1 flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
            <Shield size={10} className="text-orange-400" />
            <span className="text-[9px] font-bold text-orange-300 uppercase tracking-tighter">
              Team: Response Alpha
            </span>
          </div>
        </div>
      )}
    </div>
  );


  const renderUserSection = () => (
    <div className="border-t border-slate-800/80 p-3">
      <div
        className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors"
        onClick={() => !collapsed && setProfileOpen(!profileOpen)}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        )}
      </div>

      {profileOpen && !collapsed && (
        <div className="mt-1 mx-1 py-1 bg-slate-800 rounded-lg border border-slate-700 shadow-xl">
          <NavLink
            to="/settings"
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/60 transition-colors"
            onClick={() => {
              setProfileOpen(false);
              setMobileOpen?.(false);
            }}
          >
            <User size={14} /> Profile
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transform transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between pr-2">
          {renderLogo()}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {renderNav()}
        {renderUserSection()}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-slate-950 border-r border-slate-800/80 transition-all duration-300 ${sidebarWidth}`}
      >
        {renderLogo()}
        {renderNav()}
        {renderUserSection()}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}