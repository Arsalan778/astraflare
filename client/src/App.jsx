import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '@hooks/useAuth';
import { refreshUser } from '@store/authSlice';
import useWebSocket from '@hooks/useWebSocket';

import MainLayout from '@components/Layout/MainLayout';
import AdminLayout from '@components/Layout/AdminLayout';

import Dashboard from '@pages/Dashboard';
import MapView from '@pages/MapView';
import Predictions from '@pages/Predictions';
import PyroSagePage from '@pages/PyroSagePage';
import Alerts from '@pages/Alerts';
import Reports from '@pages/Reports';
import Login from '@pages/Login';
import Register from '@pages/Register';
import VerifyEmail from '@pages/VerifyEmail';
import AdminDashboard from '@pages/AdminDashboard';
import Settings from '@pages/Settings';
import ViewMembers from '@pages/Members/ViewMembers';
import AddMember from '@pages/Members/AddMember';
import MemberDetails from '@pages/Members/MemberDetails';


import LoadingSpinner from '@components/Common/LoadingSpinner';

function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-950">
        <LoadingSpinner size="lg" text="Authenticating..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();

  // Initialize WebSocket connection when authenticated
  useWebSocket(isAuthenticated);

  useEffect(() => {
    dispatch(refreshUser());
  }, [dispatch]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="map" element={<MapView />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="pyrosage" element={<PyroSagePage />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="members" element={<ViewMembers />} />
        <Route path="members/add" element={<AddMember />} />
        <Route path="members/edit/:id" element={<AddMember />} />
        <Route path="members/:id" element={<MemberDetails />} />

        <Route path="settings" element={<Settings />} />

      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}