import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { generalLimiter } from './rateLimiter.js';

export function applySecurity(app) {
  // CORS
  app.use(
    cors({
      origin: [
        process.env.CLIENT_URL || 'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Helmet – sensible HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // adjust for your SPA
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })

  );

  // Prevent HTTP parameter pollution
  app.use(hpp());

  // Sanitize mongo queries
  app.use(mongoSanitize());

  // Global rate limiter
  app.use('/api', generalLimiter);

  // Disable X-Powered-By
  app.disable('x-powered-by');
}