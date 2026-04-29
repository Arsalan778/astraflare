import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { predictionLimiter } from '../middleware/rateLimiter.js';
import { audit } from '../middleware/audit.js';
import {
  createPredictionSchema,
  queryPredictionsSchema,
} from '../validators/predictionSchemas.js';
import PredictionService from '../services/PredictionService.js';

const router = Router();

/**
 * @swagger
 * /api/predictions:
 *   post:
 *     tags: [Predictions]
 *     summary: Request a new wildfire risk prediction
 */
router.post(
  '/',
  authenticate,
  predictionLimiter,
  validate(createPredictionSchema),
  audit('prediction:create'),
  async (req, res, next) => {
    try {
      const prediction = await PredictionService.create(req.body, req.user._id, req.app.get('io'));
      res.status(202).json({ success: true, data: prediction });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/predictions:
 *   get:
 *     tags: [Predictions]
 *     summary: List predictions
 */
router.get(
  '/',
  authenticate,
  validate(queryPredictionsSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await PredictionService.list(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// ── Static/named routes MUST come before /:id ────────────────────

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const history = await PredictionService.getHistory(req.query);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

router.get('/history/:region', authenticate, async (req, res, next) => {
  try {
    const history = await PredictionService.getHistory(
      req.params.region,
      req.query
    );
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

router.get('/stats/summary', authenticate, async (req, res, next) => {
  try {
    const stats = await PredictionService.getSummaryStats(req.query);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

router.get('/feature-importance', authenticate, async (req, res, next) => {
  try {
    const importance = await PredictionService.getFeatureImportance(req.query);
    res.json({ success: true, data: importance || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/risk-trends', authenticate, async (req, res, next) => {
  try {
    const trends = await PredictionService.getRiskTrends(req.query);
    res.json({ success: true, data: trends || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/regions', authenticate, async (req, res, next) => {
  try {
    const regions = await PredictionService.getRegions(req.query);
    res.json({ success: true, data: regions || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/region/:id/historical', authenticate, async (req, res) => {
  res.status(501).json({
    message: 'Not yet implemented',
    endpoint: '/api/predictions/region/:id/historical',
  });
});

router.post('/batch', authenticate, async (req, res) => {
  res.status(501).json({
    message: 'Not yet implemented',
    endpoint: '/api/predictions/batch',
  });
});

router.post('/evacuation-routes', authenticate, async (req, res) => {
  res.status(501).json({
    message: 'Not yet implemented',
    endpoint: '/api/predictions/evacuation-routes',
  });
});

// ── Dynamic /:id routes AFTER all static routes ──────────────────

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const prediction = await PredictionService.getById(req.params.id);
    res.json({ success: true, data: prediction });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/explanation', authenticate, async (req, res, next) => {
  try {
    const explanation = await PredictionService.getExplanation(req.params.id);
    res.json({ success: true, data: explanation });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/fire-spread', authenticate, async (req, res, next) => {
  try {
    const spread = await PredictionService.getFireSpread(req.params.id);
    res.json({ success: true, data: spread });
  } catch (err) {
    next(err);
  }
});

export default router;