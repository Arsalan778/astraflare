import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { WS_EVENTS } from '../config/constants.js';
import logger from '../config/logger.js';

export function initSocketHandler(io) {
  // ── Authentication middleware ──────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select(
        'firstName lastName email role isActive'
      );

      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket auth failed: ${err.message}`);
      next(new Error('Authentication failed'));
    }
  });

  // ── Connection handler ────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    logger.info(
      `🔌 Socket connected: ${socket.id} user=${socket.user.email}`
    );

    // Auto-join user's personal room
    socket.join(`user:${userId}`);

    // Auto-join role room
    socket.join(`role:${socket.user.role}`);

    // ── Join map room ───────────────────────────────────────
    socket.on('map:join', () => {
      socket.join('map');
      logger.debug(`Socket ${socket.id} joined map room`);
    });

    socket.on('map:leave', () => {
      socket.leave('map');
      logger.debug(`Socket ${socket.id} left map room`);
    });

    // ── Join region-specific room ───────────────────────────
    socket.on('region:subscribe', (regionName) => {
      if (regionName && typeof regionName === 'string') {
        const room = `region:${regionName.toLowerCase().replace(/\s+/g, '_')}`;
        socket.join(room);
        logger.debug(`Socket ${socket.id} subscribed to ${room}`);
      }
    });

    socket.on('region:unsubscribe', (regionName) => {
      if (regionName && typeof regionName === 'string') {
        const room = `region:${regionName.toLowerCase().replace(/\s+/g, '_')}`;
        socket.leave(room);
        logger.debug(`Socket ${socket.id} unsubscribed from ${room}`);
      }
    });

    // ── Join alert room ─────────────────────────────────────
    socket.on('alerts:subscribe', () => {
      socket.join('alerts');
      logger.debug(`Socket ${socket.id} subscribed to alerts`);
    });

    socket.on('alerts:unsubscribe', () => {
      socket.leave('alerts');
    });

    // ── Fire spread simulation room ─────────────────────────
    socket.on('simulation:join', (simulationId) => {
      if (simulationId) {
        socket.join(`simulation:${simulationId}`);
        logger.debug(`Socket ${socket.id} joined simulation ${simulationId}`);
      }
    });

    socket.on('simulation:leave', (simulationId) => {
      if (simulationId) {
        socket.leave(`simulation:${simulationId}`);
      }
    });

    // ── Request current status ──────────────────────────────
    socket.on('status:request', () => {
      socket.emit(WS_EVENTS.SYSTEM_STATUS, {
        type: 'status_response',
        serverUptime: process.uptime(),
        connectedClients: io.engine.clientsCount,
        timestamp: new Date().toISOString(),
      });
    });

    // ── Ping / pong for latency ─────────────────────────────
    socket.on('ping:check', (clientTimestamp) => {
      socket.emit('pong:check', {
        clientTimestamp,
        serverTimestamp: Date.now(),
      });
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(
        `🔌 Socket disconnected: ${socket.id} user=${socket.user.email} reason=${reason}`
      );
    });

    socket.on('error', (err) => {
      logger.error(`Socket error ${socket.id}:`, err.message);
    });
  });

  // ── Periodic broadcast ────────────────────────────────────
  setInterval(() => {
    io.emit(WS_EVENTS.SYSTEM_STATUS, {
      type: 'heartbeat',
      connectedClients: io.engine.clientsCount,
      timestamp: new Date().toISOString(),
    });
  }, 30000); // every 30s

  logger.info('✅  WebSocket handler initialised');
}