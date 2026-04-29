import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  loginUser,
  registerUser,
  logoutUser,
  updateProfile,
  clearError,
  clearRegisterSuccess,
} from '@store/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    registerSuccess,
  } = useSelector((state) => state.auth);

  const login = useCallback(
    (credentials) => dispatch(loginUser(credentials)),
    [dispatch]
  );

  const register = useCallback(
    (userData) => dispatch(registerUser(userData)),
    [dispatch]
  );

  const logout = useCallback(() => dispatch(logoutUser()), [dispatch]);

  const update = useCallback(
    (profileData) => dispatch(updateProfile(profileData)),
    [dispatch]
  );

  const resetError = useCallback(() => dispatch(clearError()), [dispatch]);

  const resetRegisterSuccess = useCallback(
    () => dispatch(clearRegisterSuccess()),
    [dispatch]
  );

  const isAdmin = user?.role === 'admin';
  const isAnalyst = user?.role === 'analyst' || isAdmin;

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    error,
    registerSuccess,
    isAdmin,
    isAnalyst,
    login,
    register,
    logout,
    update,
    resetError,
    resetRegisterSuccess,
  };
}

export default useAuth;