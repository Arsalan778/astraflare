import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { audit } from '../middleware/audit.js';
import { ROLES } from '../config/constants.js';
import ReportService from '../services/ReportService.js';

const router = Router();

// ── Static/named routes MUST come before /:id ────────────────────

router.get('/stats/summary', authenticate, async (req, res, next) => {
  try {
    const stats = await ReportService.getStats(req.user);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// ── CRUD routes ───────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('report:generate'),
  async (req, res, next) => {
    try {
      const report = await ReportService.generate(req.body, req.user._id);
      res.status(202).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await ReportService.list(req.query, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// ── Dynamic /:id routes AFTER all static routes ───────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const report = await ReportService.getById(req.params.id);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const { filePath, fileName, mimeType } = await ReportService.getDownload(req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('report:delete'),
  async (req, res, next) => {
    try {
      await ReportService.remove(req.params.id);
      res.json({ success: true, message: 'Report deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;