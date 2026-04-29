import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { audit } from '../middleware/audit.js';
import { ROLES } from '../config/constants.js';
import AlertService from '../services/AlertService.js';

const router = Router();

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: List alerts (with filters)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await AlertService.list(req.query, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ── Static/named routes MUST come before /:id ────────────────────

router.get('/active', authenticate, async (req, res, next) => {
  try {
    const alerts = await AlertService.getActive(req.query);
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

router.get('/stats/summary', authenticate, async (req, res, next) => {
  try {
    const stats = await AlertService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// Notifications sub-routes — all static, must be before /:id
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const notifications = await AlertService.getNotifications(req.user._id, req.query);
    res.json({ success: true, notifications: notifications || [] });
  } catch (err) {
    next(err);
  }
});

// read-all MUST come before /:id (otherwise 'read-all' would be treated as notification id)
router.patch('/notifications/read-all', authenticate, async (req, res, next) => {
  try {
    await AlertService.markAllNotificationsAsRead(req.user._id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

router.delete('/notifications', authenticate, async (req, res, next) => {
  try {
    await AlertService.deleteAllNotifications(req.user._id);
    res.json({ success: true, message: 'All notifications deleted' });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await AlertService.markNotificationAsRead(req.params.id, req.user._id);
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

router.delete('/notifications/:id', authenticate, async (req, res, next) => {
  try {
    await AlertService.deleteNotification(req.params.id, req.user._id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('alert:create_manual'),
  async (req, res, next) => {
    try {
      const alert = await AlertService.createManual(req.body, req.user._id, req.app.get('io'));
      res.status(201).json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);

// ── Dynamic /:id routes AFTER all static routes ──────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const alert = await AlertService.getById(req.params.id);
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/acknowledge',
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('alert:acknowledge'),
  async (req, res, next) => {
    try {
      const alert = await AlertService.acknowledge(req.params.id, req.user._id, req.app.get('io'));
      res.json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id/resolve',
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('alert:resolve'),
  async (req, res, next) => {
    try {
      const alert = await AlertService.resolve(req.params.id, req.user._id, req.app.get('io'));
      res.json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }
);

export default router;