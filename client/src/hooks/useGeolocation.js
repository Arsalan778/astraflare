import { useState, useEffect, useCallback } from 'react';

const defaultOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes cache
};

export function useGeolocation(options = {}) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const mergedOptions = { ...defaultOptions, ...options };

  const onSuccess = useCallback((pos) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const onError = useCallback((err) => {
    let message;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access.';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'Location information unavailable.';
        break;
      case err.TIMEOUT:
        message = 'Location request timed out.';
        break;
      default:
        message = 'An unknown error occurred while retrieving location.';
    }
    setError({ code: err.code, message });
    setIsLoading(false);
  }, []);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(onSuccess, onError, mergedOptions);
  }, [onSuccess, onError, mergedOptions]);

  // Watch position for continuous tracking
  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser.',
      });
      return null;
    }

    setIsLoading(true);
    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      mergedOptions
    );
    return watchId;
  }, [onSuccess, onError, mergedOptions]);

  const clearWatch = useCallback((watchId) => {
    if (watchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Auto-request on mount if auto option is set
  useEffect(() => {
    if (options.auto) {
      requestPosition();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    position,
    error,
    isLoading,
    isSupported: !!navigator.geolocation,
    requestPosition,
    watchPosition,
    clearWatch,
  };
}

export default useGeolocation;