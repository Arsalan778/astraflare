import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

import { updatePredictionFromSocket } from '@store/predictionSlice';
import { addSocketMessage } from '@store/chatSlice';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ||
  'http://localhost:5000';

if (!import.meta.env.VITE_SOCKET_URL) {
  console.warn(
    '[useWebSocket] VITE_SOCKET_URL is not set. ' +
      'Falling back to: ' + SOCKET_URL +
      ' — set VITE_SOCKET_URL in client/.env for production.'
  );
}

export function useWebSocket(enabled = true) {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  const accessToken = useSelector((state) => state.auth.accessToken);

  const connect = useCallback(() => {
    if (!enabled || !accessToken) return;

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket.id);
      reconnectAttempts.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('[WS] Max reconnection attempts reached');
        socket.disconnect();
      }
    });

    // ---- Domain Events ----

    // Real-time prediction updates
    socket.on('prediction:update', (data) => {
      dispatch(updatePredictionFromSocket(data));
    });

    socket.on('prediction:complete', (data) => {
      dispatch(updatePredictionFromSocket(data));
      toast.success('Risk assessment complete');
    });

    // New alert notifications
    socket.on('alert:new', (alert) => {
      const riskColors = {
        extreme: '🔴',
        high: '🟠',
        moderate: '🟡',
        low: '🟢',
      };
      const icon = riskColors[alert.riskLevel] || '⚠️';
      toast(`${icon} ${alert.title || 'New Wildfire Alert'}`, {
        duration: 6000,
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #ef4444',
        },
      });
    });

    // Alert resolved
    socket.on('alert:resolved', (alert) => {
      toast.success(`Alert resolved: ${alert.title || alert.id}`);
    });

    // Chat messages (from PyroSage)
    socket.on('chat:message', (message) => {
      dispatch(addSocketMessage(message));
    });

    // System notifications
    socket.on('system:notification', (notification) => {
      toast(notification.message, {
        icon: notification.icon || 'ℹ️',
        duration: notification.duration || 4000,
      });
    });

    // Model training updates
    socket.on('model:training-progress', (progress) => {
      console.log('[WS] Training progress:', progress);
    });

    socket.on('model:training-complete', (result) => {
      toast.success(
        `Model training complete! Accuracy: ${(result.accuracy * 100).toFixed(1)}%`
      );
    });

    // Fire spread simulation updates
    socket.on('simulation:update', (data) => {
      // Dispatched separately if component is listening
      console.log('[WS] Simulation update:', data.timestep);
    });

    socketRef.current = socket;

    return socket;
  }, [enabled, accessToken, dispatch]);

  // Connect / reconnect when enabled + token changes
  useEffect(() => {
    const socket = connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connect]);

  // Emit helper
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[WS] Socket not connected, cannot emit:', event);
    }
  }, []);

  // Subscribe to a room/channel
  const joinRoom = useCallback(
    (room) => emit('join:room', { room }),
    [emit]
  );

  const leaveRoom = useCallback(
    (room) => emit('leave:room', { room }),
    [emit]
  );

  // Listen to an event and return cleanup function
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    emit,
    on,
    joinRoom,
    leaveRoom,
  };
}

export default useWebSocket;