import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });
import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';

import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import logger from './config/logger.js';
import { setupSwagger } from './config/swagger.js';
import { applySecurity } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initSocketHandler } from './websocket/socketHandler.js';

import authRoutes from './routes/auth.js';
import predictionRoutes from './routes/predictions.js';
import pyrosageRoutes from './routes/pyrosage.js';
import alertRoutes from './routes/alerts.js';
import mapRoutes from './routes/map.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import dataRoutes from './routes/data.js';
import memberRoutes from './routes/members.js';


const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible in routes
app.set('io', io);

// ── Core middleware ──────────────────────────────────────────────
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

// ── Security ────────────────────────────────────────────────────
applySecurity(app);

// ── Static Files ────────────────────────────────────────────────
app.use('/uploads', express.static(resolve(__dirname, 'uploads')));


// ── Swagger docs ────────────────────────────────────────────────
setupSwagger(app);

// ── Health check ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// ── API routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/pyrosage', pyrosageRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/members', memberRoutes);


// ── Error handling ──────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Boot ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function boot() {
  try {
    await connectDB();
    await connectRedis();
    initSocketHandler(io);

    if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
      server.listen(PORT, () => {
        logger.info(`🚀  AstraFlare server running on port ${PORT}`);
        logger.info(`📄  Swagger docs at http://localhost:${PORT}/api/docs`);
      });
    }
  } catch (err) {
    logger.error('Failed to start server', err);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Only run boot if not in a serverless environment that handles its own entry point
// or if we explicitly want to start the standalone server.
if (!process.env.VERCEL) {
  boot();
}

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received – shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});

export { app, server, io };