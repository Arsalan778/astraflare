import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

/**
 * Audit logging middleware factory.
 * @param {string} action – human-readable action name
 */
export const audit = (action) => {
  return async (req, res, next) => {
    // Capture original res.json to log after response
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      // Fire and forget – don't block response
      setImmediate(async () => {
        try {
          await AuditLog.create({
            userId: req.user?._id || null,
            action,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            requestBody: sanitiseBody(req.body),
            responseSuccess: body?.success ?? null,
          });
        } catch (err) {
          logger.error('Audit log write failed', err);
        }
      });

      return originalJson(body);
    };

    next();
  };
};

function sanitiseBody(body) {
  if (!body) return undefined;
  const clone = { ...body };
  const sensitiveKeys = ['password', 'token', 'secret', 'creditCard'];
  for (const key of sensitiveKeys) {
    if (clone[key]) clone[key] = '***REDACTED***';
  }
  return clone;
}