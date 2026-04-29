import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Cog6ToothIcon,
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon,
  MapPinIcon,
  ArrowPathIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@hooks/useAuth';
import { useGeolocation } from '@hooks/useGeolocation';
import authAPI from '@api/auth';
import GlowCard from '@components/Common/GlowCard';
import LoadingSpinner from '@components/Common/LoadingSpinner';

const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: UserCircleIcon },
  { key: 'notifications', label: 'Notifications', icon: BellIcon },
  { key: 'security', label: 'Security', icon: ShieldCheckIcon },
  { key: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
  { key: 'map', label: 'Map Preferences', icon: GlobeAltIcon },
  { key: 'danger', label: 'Danger Zone', icon: ExclamationTriangleIcon },
];

export default function Settings() {
  const { user, update, logout } = useAuth();
  const { position, requestPosition, isLoading: geoLoading } = useGeolocation();

  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  // ─── Profile Form ───
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    bio: '',
    phone: '',
  });

  // ─── Notification Prefs ───
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushAlerts: true,
    criticalOnly: false,
    dailyDigest: true,
    predictionUpdates: true,
    systemNotifications: false,
  });

  // ─── Security ───
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ─── Appearance ───
  const [appearance, setAppearance] = useState({
    theme: 'dark',
    compactMode: false,
    animationsEnabled: true,
    mapStyle: 'dark',
  });

  // ─── Map Prefs ───
  const [mapPrefs, setMapPrefs] = useState({
    defaultCenter: { lat: 36.7783, lng: -119.4179 },
    defaultZoom: 6,
    showHeatmap: true,
    showRiskZones: true,
    showFireSpread: false,
    show3D: false,
    autoRefresh: true,
    refreshInterval: 60,
    clusterMarkers: true,
    showWeatherOverlay: false,
  });

  // ─── Danger Zone ───
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ─── Hydrate from user ───
  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        organization: user.organization || '',
        bio: user.bio || '',
        phone: user.phone || '',
      });
      if (user.preferences) {
        if (user.preferences.notifications) {
          setNotifications((prev) => ({ ...prev, ...user.preferences.notifications }));
        }
        if (user.preferences.appearance) {
          setAppearance((prev) => ({ ...prev, ...user.preferences.appearance }));
        }
        if (user.preferences.map) {
          setMapPrefs((prev) => ({ ...prev, ...user.preferences.map }));
        }
      }
    }
  }, [user]);

  // ─── Save Handlers ───

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await update(profile);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await update({ preferences: { notifications } });
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error('Failed to save notifications');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsSaving(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    setIsSaving(true);
    try {
      await update({ preferences: { appearance } });
      toast.success('Appearance settings saved');
    } catch (err) {
      toast.error('Failed to save appearance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMapPrefs = async () => {
    setIsSaving(true);
    try {
      await update({ preferences: { map: mapPrefs } });
      toast.success('Map preferences saved');
    } catch (err) {
      toast.error('Failed to save map preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseCurrentLocation = () => {
    requestPosition();
  };

  useEffect(() => {
    if (position) {
      setMapPrefs((prev) => ({
        ...prev,
        defaultCenter: {
          lat: parseFloat(position.latitude.toFixed(4)),
          lng: parseFloat(position.longitude.toFixed(4)),
        },
      }));
      toast.success('Location updated from GPS');
    }
  }, [position]);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      toast.error('Please type your email to confirm');
      return;
    }
    setIsSaving(true);
    try {
      await authAPI.deleteAccount?.();
      toast.success('Account deleted');
      logout();
    } catch (err) {
      toast.error('Failed to delete account. Contact support.');
    } finally {
      setIsSaving(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExportData = async () => {
    try {
      toast.loading('Preparing your data export...');
      const response = await authAPI.exportData?.();
      const blob = new Blob([JSON.stringify(response, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `astraflare-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('Data exported successfully');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to export data');
    }
  };

  // ─── Toggle Component ───
  const Toggle = ({ enabled, onChange }) => (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-primary-500' : 'bg-dark-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  // ─── Setting Row Component ───
  const SettingRow = ({ label, desc, enabled, onChange }) => (
    <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
      <div className="mr-4">
        <div className="text-sm font-medium text-white">{label}</div>
        {desc && <div className="text-xs text-dark-400 mt-0.5">{desc}</div>}
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );

  // ─── Section Renderers ───

  const renderProfile = () => (
    <GlowCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>
      <div className="space-y-5 max-w-xl">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-fire-600 flex items-center justify-center text-2xl font-bold text-white">
            {profile.firstName?.[0]?.toUpperCase() || 'U'}
            {profile.lastName?.[0]?.toUpperCase() || ''}
          </div>
          <div>
            <div className="text-white font-semibold">
              {profile.firstName} {profile.lastName}
            </div>
            <div className="text-dark-400 text-sm capitalize">{user?.role || 'user'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="input-label">First Name</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="input-label">Last Name</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="input-label">Email</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="input-field opacity-60 cursor-not-allowed"
          />
          <p className="text-xs text-dark-500 mt-1">
            Email cannot be changed. Contact admin for assistance.
          </p>
        </div>

        <div>
          <label className="input-label">Phone Number <span className="text-dark-500 font-normal">(optional)</span></label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+1 (555) 123-4567"
            className="input-field"
          />
        </div>

        <div>
          <label className="input-label">Organization <span className="text-dark-500 font-normal">(optional)</span></label>
          <input
            type="text"
            value={profile.organization}
            onChange={(e) => setProfile((p) => ({ ...p, organization: e.target.value }))}
            placeholder="Fire Department, Research Lab..."
            className="input-field"
          />
        </div>

        <div>
          <label className="input-label">Bio <span className="text-dark-500 font-normal">(optional)</span></label>
          <textarea
            rows={3}
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Tell us about yourself and your work..."
            className="input-field resize-none"
            maxLength={500}
          />
          <p className="text-xs text-dark-500 mt-1 text-right">
            {profile.bio.length}/500
          </p>
        </div>

        <button onClick={handleSaveProfile} disabled={isSaving} className="btn-primary">
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </GlowCard>
  );

  const renderNotifications = () => (
    <GlowCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Notification Preferences</h3>
      <div className="space-y-3 max-w-xl">
        <SettingRow
          label="Email Alerts"
          desc="Receive fire alerts via email"
          enabled={notifications.emailAlerts}
          onChange={() => setNotifications((p) => ({ ...p, emailAlerts: !p.emailAlerts }))}
        />
        <SettingRow
          label="Push Notifications"
          desc="Browser push notifications for critical events"
          enabled={notifications.pushAlerts}
          onChange={() => setNotifications((p) => ({ ...p, pushAlerts: !p.pushAlerts }))}
        />
        <SettingRow
          label="Critical Only"
          desc="Only notify for extreme / catastrophic risk levels"
          enabled={notifications.criticalOnly}
          onChange={() => setNotifications((p) => ({ ...p, criticalOnly: !p.criticalOnly }))}
        />
        <SettingRow
          label="Daily Digest"
          desc="Receive a daily summary email of fire activity"
          enabled={notifications.dailyDigest}
          onChange={() => setNotifications((p) => ({ ...p, dailyDigest: !p.dailyDigest }))}
        />
        <SettingRow
          label="Prediction Updates"
          desc="Notify when new predictions are available for watched regions"
          enabled={notifications.predictionUpdates}
          onChange={() => setNotifications((p) => ({ ...p, predictionUpdates: !p.predictionUpdates }))}
        />
        <SettingRow
          label="System Notifications"
          desc="Model training completion, maintenance, downtime alerts"
          enabled={notifications.systemNotifications}
          onChange={() => setNotifications((p) => ({ ...p, systemNotifications: !p.systemNotifications }))}
        />

        <button onClick={handleSaveNotifications} disabled={isSaving} className="btn-primary mt-4">
          {isSaving ? 'Saving...' : 'Save Notifications'}
        </button>
      </div>
    </GlowCard>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-5 max-w-xl">
          <div>
            <label className="input-label">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                }
                required
                className="input-field pr-11"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
              >
                {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                }
                required
                minLength={8}
                className="input-field pr-11"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
              >
                {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {passwordForm.newPassword && passwordForm.newPassword.length < 8 && (
              <p className="text-yellow-400 text-xs mt-1">Password must be at least 8 characters</p>
            )}
          </div>

          <div>
            <label className="input-label">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                required
                className="input-field pr-11"
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {passwordForm.confirmPassword &&
              passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match.</p>
              )}
          </div>

          <button
            type="submit"
            disabled={
              isSaving ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              !passwordForm.confirmPassword ||
              passwordForm.newPassword !== passwordForm.confirmPassword
            }
            className="btn-primary"
          >
            {isSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </GlowCard>

      {/* Account Info */}
      <GlowCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
        <div className="space-y-3 text-sm max-w-xl">
          {[
            {
              label: 'Account created',
              value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A',
            },
            { label: 'Role', value: user?.role || 'user', capitalize: true },
            {
              label: 'Email verified',
              value: user?.emailVerified ? 'Verified' : 'Not verified',
              color: user?.emailVerified ? 'text-green-400' : 'text-yellow-400',
            },
            {
              label: 'Last login',
              value: user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'N/A',
            },
            { label: 'User ID', value: user?.id || 'N/A', mono: true },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center py-2 border-b border-dark-800/50 last:border-0">
              <span className="text-dark-400">{row.label}</span>
              <span
                className={`${row.color || 'text-dark-200'} ${
                  row.capitalize ? 'capitalize' : ''
                } ${row.mono ? 'font-mono text-xs' : ''}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </GlowCard>
    </div>
  );

  const renderAppearance = () => (
    <GlowCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Appearance</h3>
      <div className="space-y-6 max-w-xl">
        {/* Theme Selector */}
        <div>
          <label className="input-label">Theme</label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { key: 'dark', emoji: '🌙', label: 'Dark' },
              { key: 'light', emoji: '☀️', label: 'Light' },
              { key: 'system', emoji: '💻', label: 'System' },
            ].map((theme) => (
              <button
                key={theme.key}
                onClick={() => setAppearance((p) => ({ ...p, theme: theme.key }))}
                className={`p-4 rounded-xl border text-sm font-medium text-center transition-all ${
                  appearance.theme === theme.key
                    ? 'bg-primary-500/15 border-primary-500/30 text-primary-400'
                    : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-dark-200 hover:border-dark-600'
                }`}
              >
                <span className="text-xl block mb-1">{theme.emoji}</span>
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map Style */}
        <div>
          <label className="input-label">Map Style</label>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { key: 'dark', emoji: '🗺️', label: 'Dark' },
              { key: 'satellite', emoji: '🛰️', label: 'Satellite' },
              { key: 'terrain', emoji: '⛰️', label: 'Terrain' },
            ].map((style) => (
              <button
                key={style.key}
                onClick={() => setAppearance((p) => ({ ...p, mapStyle: style.key }))}
                className={`p-4 rounded-xl border text-sm font-medium text-center transition-all ${
                  appearance.mapStyle === style.key
                    ? 'bg-primary-500/15 border-primary-500/30 text-primary-400'
                    : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:text-dark-200 hover:border-dark-600'
                }`}
              >
                <span className="text-xl block mb-1">{style.emoji}</span>
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <SettingRow
            label="Compact Mode"
            desc="Reduce spacing and padding for denser layouts"
            enabled={appearance.compactMode}
            onChange={() => setAppearance((p) => ({ ...p, compactMode: !p.compactMode }))}
          />
          <SettingRow
            label="Animations"
            desc="Enable UI transitions and motion effects"
            enabled={appearance.animationsEnabled}
            onChange={() => setAppearance((p) => ({ ...p, animationsEnabled: !p.animationsEnabled }))}
          />
        </div>

        <button onClick={handleSaveAppearance} disabled={isSaving} className="btn-primary">
          {isSaving ? 'Saving...' : 'Save Appearance'}
        </button>
      </div>
    </GlowCard>
  );

  const renderMapPrefs = () => (
    <GlowCard className="p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Map Preferences</h3>
      <div className="space-y-6 max-w-xl">
        {/* Default Center */}
        <div>
          <label className="input-label mb-2">Default Map Center</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-dark-500 mb-1 block">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={mapPrefs.defaultCenter.lat}
                onChange={(e) =>
                  setMapPrefs((p) => ({
                    ...p,
                    defaultCenter: {
                      ...p.defaultCenter,
                      lat: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-dark-500 mb-1 block">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={mapPrefs.defaultCenter.lng}
                onChange={(e) =>
                  setMapPrefs((p) => ({
                    ...p,
                    defaultCenter: {
                      ...p.defaultCenter,
                      lng: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
                className="input-field"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={geoLoading}
            className="mt-2 flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            {geoLoading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <MapPinIcon className="w-4 h-4" />
            )}
            {geoLoading ? 'Detecting...' : 'Use my current location'}
          </button>
        </div>

        {/* Default Zoom */}
        <div>
          <label className="input-label">
            Default Zoom Level:{' '}
            <span className="text-primary-400 font-semibold">{mapPrefs.defaultZoom}</span>
          </label>
          <input
            type="range"
            min={1}
            max={18}
            step={1}
            value={mapPrefs.defaultZoom}
            onChange={(e) =>
              setMapPrefs((p) => ({ ...p, defaultZoom: parseInt(e.target.value, 10) }))
            }
            className="w-full mt-2 accent-primary-500 h-2 bg-dark-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary-500/30"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>World</span>
            <span>Street</span>
          </div>
        </div>

        {/* Refresh Interval */}
        <div>
          <label className="input-label">Auto-Refresh Interval (seconds)</label>
          <select
            value={mapPrefs.refreshInterval}
            onChange={(e) =>
              setMapPrefs((p) => ({ ...p, refreshInterval: parseInt(e.target.value, 10) }))
            }
            className="input-field mt-1"
          >
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
            <option value={300}>5 minutes</option>
            <option value={600}>10 minutes</option>
          </select>
        </div>

        {/* Layer Toggles */}
        <div>
          <label className="input-label mb-3">Default Layers</label>
          <div className="space-y-3">
            <SettingRow
              label="Heatmap Layer"
              desc="Show fire risk heatmap by default"
              enabled={mapPrefs.showHeatmap}
              onChange={() => setMapPrefs((p) => ({ ...p, showHeatmap: !p.showHeatmap }))}
            />
            <SettingRow
              label="Risk Zones"
              desc="Show color-coded risk zone boundaries"
              enabled={mapPrefs.showRiskZones}
              onChange={() => setMapPrefs((p) => ({ ...p, showRiskZones: !p.showRiskZones }))}
            />
            <SettingRow
              label="Fire Spread Simulation"
              desc="Show fire spread projections on the map"
              enabled={mapPrefs.showFireSpread}
              onChange={() => setMapPrefs((p) => ({ ...p, showFireSpread: !p.showFireSpread }))}
            />
            <SettingRow
              label="3D Terrain"
              desc="Enable 3D terrain elevation on the map"
              enabled={mapPrefs.show3D}
              onChange={() => setMapPrefs((p) => ({ ...p, show3D: !p.show3D }))}
            />
            <SettingRow
              label="Auto Refresh"
              desc="Automatically refresh map data at intervals"
              enabled={mapPrefs.autoRefresh}
              onChange={() => setMapPrefs((p) => ({ ...p, autoRefresh: !p.autoRefresh }))}
            />
            <SettingRow
              label="Cluster Markers"
              desc="Group nearby markers into clusters at low zoom"
              enabled={mapPrefs.clusterMarkers}
              onChange={() => setMapPrefs((p) => ({ ...p, clusterMarkers: !p.clusterMarkers }))}
            />
            <SettingRow
              label="Weather Overlay"
              desc="Show wind and temperature data on the map"
              enabled={mapPrefs.showWeatherOverlay}
              onChange={() =>
                setMapPrefs((p) => ({ ...p, showWeatherOverlay: !p.showWeatherOverlay }))
              }
            />
          </div>
        </div>

        <button onClick={handleSaveMapPrefs} disabled={isSaving} className="btn-primary">
          {isSaving ? 'Saving...' : 'Save Map Preferences'}
        </button>
      </div>
    </GlowCard>
  );

  const renderDangerZone = () => (
    <div className="space-y-6">
      {/* Export Data */}
      <GlowCard className="p-6 border-yellow-500/20">
        <h3 className="text-lg font-semibold text-white mb-2">Export Your Data</h3>
        <p className="text-dark-400 text-sm mb-4">
          Download a copy of all your data including predictions, conversations, and settings.
        </p>
        <button onClick={handleExportData} className="btn-secondary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Export Data
        </button>
      </GlowCard>

      {/* Delete Account */}
      <GlowCard className="p-6 border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          Delete Account
        </h3>
        <p className="text-dark-400 text-sm mb-4">
          Permanently delete your account and all associated data. This action{' '}
          <span className="text-red-400 font-semibold">cannot be undone</span>.
        </p>

        {!showDeleteDialog ? (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="btn-danger flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Delete My Account
          </button>
        ) : (
          <motion.div
            className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <p className="text-sm text-dark-300">
              To confirm, type your email address:{' '}
              <span className="font-mono text-red-400">{user?.email}</span>
            </p>
            <input
              type="email"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type your email to confirm"
              className="input-field border-red-500/30 focus:ring-red-500/50 focus:border-red-500/50"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={isSaving || deleteConfirm !== user?.email}
                className="btn-danger flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-4 h-4" />
                    Permanently Delete
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirm('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </GlowCard>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfile();
      case 'notifications':
        return renderNotifications();
      case 'security':
        return renderSecurity();
      case 'appearance':
        return renderAppearance();
      case 'map':
        return renderMapPrefs();
      case 'danger':
        return renderDangerZone();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-dark-800 border border-dark-700">
            <Cog6ToothIcon className="w-6 h-6 text-dark-300" />
          </div>
          Settings
        </h1>
        <p className="text-dark-400 mt-1">
          Manage your account, preferences, and application settings.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <motion.div
          className="lg:w-60 flex-shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <nav className="space-y-1 lg:sticky lg:top-6">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.key;
              const isDanger = section.key === 'danger';

              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive
                      ? isDanger
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                      : isDanger
                      ? 'text-red-400/60 hover:bg-red-500/5 hover:text-red-400 border border-transparent'
                      : 'text-dark-400 hover:bg-dark-800/60 hover:text-dark-200 border border-transparent'
                  }`}
                >
                  <section.icon className="w-5 h-5 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </motion.div>

        {/* Section Content */}
        <motion.div
          className="flex-1 min-w-0"
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderActiveSection()}
        </motion.div>
      </div>
    </div>
  );
}