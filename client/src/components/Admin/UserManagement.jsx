// client/src/components/Admin/UserManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  ChevronUpDownIcon,
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  EnvelopeIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../../api/admin';
import LoadingSpinner from '../Common/LoadingSpinner';
import GlowCard from '../Common/GlowCard';
import useDebounce from '../../hooks/useDebounce';

const ROLES = ['user', 'analyst', 'responder', 'admin', 'superadmin'];
const STATUSES = ['active', 'inactive', 'suspended', 'pending'];

const ROLE_COLORS = {
  user: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  analyst: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  responder: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  superadmin: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-300',
  inactive: 'bg-gray-500/20 text-gray-400',
  suspended: 'bg-red-500/20 text-red-300',
  pending: 'bg-yellow-500/20 text-yellow-300',
};

/* ─── Reusable tiny components ─── */
const Badge = ({ text, colorClass }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}
  >
    {text}
  </span>
);

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger = false }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          {danger && (
            <div className="p-2 bg-red-500/20 rounded-full">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Edit User Modal ─── */
const EditUserModal = ({ user, open, onClose, onSave }) => {
  const [form, setForm] = useState({ role: '', status: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ role: user.role, status: user.status });
    }
  }, [user]);

  if (!open || !user) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user._id, form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Edit User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* User info header */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-800/50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-lg">
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-white font-medium">{user.name}</p>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
        </div>

        {/* Role select */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Status select */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Invite User Modal ─── */
const InviteUserModal = ({ open, onClose, onInvite }) => {
  const [form, setForm] = useState({ email: '', name: '', role: 'user' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ email: '', name: '', role: 'user' });
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.name) {
      setError('Name and email are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await onInvite(form);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send invite.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5 text-orange-400" />
            Invite User
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              placeholder="John Doe"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              placeholder="john@example.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {sending && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
              <EnvelopeIcon className="w-4 h-4" />
              Send Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [editUser, setEditUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [actionMenuUser, setActionMenuUser] = useState(null);

  const debouncedSearch = useDebounce(searchTerm, 400);
  const limit = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sort: sortField,
        order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const { data } = await adminAPI.getUsers(params);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotalUsers(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u._id)));
    }
  };

  const handleSelectUser = (id) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await adminAPI.updateUser(userId, updates);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDeleteUser = (user) => {
    setConfirmDialog({
      open: true,
      title: 'Delete User',
      message: `Are you sure you want to permanently delete "${user.name}"? This action cannot be undone.`,
      danger: true,
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(user._id);
          fetchUsers();
          setSelectedUsers((prev) => {
            const next = new Set(prev);
            next.delete(user._id);
            return next;
          });
        } catch (err) {
          console.error('Failed to delete user:', err);
        }
        setConfirmDialog({ open: false });
      },
      onCancel: () => setConfirmDialog({ open: false }),
    });
  };

  const handleBulkAction = (action) => {
    const ids = Array.from(selectedUsers);
    if (ids.length === 0) return;

    const messages = {
      suspend: `Suspend ${ids.length} selected user(s)?`,
      activate: `Activate ${ids.length} selected user(s)?`,
      delete: `Permanently delete ${ids.length} selected user(s)? This cannot be undone.`,
    };

    setConfirmDialog({
      open: true,
      title: `Bulk ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: messages[action],
      danger: action === 'delete',
      onConfirm: async () => {
        try {
          await adminAPI.bulkUserAction({ userIds: ids, action });
          setSelectedUsers(new Set());
          fetchUsers();
        } catch (err) {
          console.error('Bulk action failed:', err);
        }
        setConfirmDialog({ open: false });
      },
      onCancel: () => setConfirmDialog({ open: false }),
    });
  };

  const handleInvite = async (inviteData) => {
    await adminAPI.inviteUser(inviteData);
    fetchUsers();
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 text-sm mt-1">
            {totalUsers} total user{totalUsers !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-orange-500/20"
        >
          <UserPlusIcon className="w-5 h-5" />
          Invite User
        </button>
      </div>

      {/* Filters */}
      <GlowCard>
        <div className="flex flex-col md:flex-row gap-4 p-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={fetchUsers}
            className="p-2.5 bg-gray-800/60 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </GlowCard>

      {/* Bulk actions */}
      {selectedUsers.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl animate-fade-in">
          <span className="text-orange-300 text-sm font-medium">
            {selectedUsers.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('suspend')}
              className="px-3 py-1.5 text-xs rounded-lg bg-yellow-600/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-600/30 transition-colors"
            >
              Suspend
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <GlowCard>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <UserCircleIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No users found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500/50"
                    />
                  </th>
                  {[
                    { key: 'name', label: 'User' },
                    { key: 'role', label: 'Role' },
                    { key: 'status', label: 'Status' },
                    { key: 'createdAt', label: 'Joined' },
                    { key: 'lastLogin', label: 'Last Login' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 select-none"
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        <ChevronUpDownIcon className="w-3.5 h-3.5" />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className={`transition-colors hover:bg-gray-800/30 ${
                      selectedUsers.has(user._id) ? 'bg-orange-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                        className="rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500/50"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium leading-tight">
                            {user.name}
                          </p>
                          <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge text={user.role} colorClass={ROLE_COLORS[user.role] || ROLE_COLORS.user} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        text={user.status}
                        colorClass={STATUS_COLORS[user.status] || STATUS_COLORS.inactive}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(user.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 relative">
                        <button
                          onClick={() => {
                            setEditUser(user);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateUser(user._id, {
                              status: user.status === 'suspended' ? 'active' : 'suspended',
                            })
                          }
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.status === 'suspended'
                              ? 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                          }`}
                          title={user.status === 'suspended' ? 'Activate' : 'Suspend'}
                        >
                          {user.status === 'suspended' ? (
                            <ShieldCheckIcon className="w-4 h-4" />
                          ) : (
                            <ShieldExclamationIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </GlowCard>

      {/* Modals */}
      <EditUserModal
        user={editUser}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditUser(null);
        }}
        onSave={handleUpdateUser}
      />
      <InviteUserModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
      <ConfirmDialog {...confirmDialog} />
    </div>
  );
}