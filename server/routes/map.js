import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import GeoService from '../services/GeoService.js';
import SatelliteService from '../services/SatelliteService.js';
import FireSpreadService from '../services/FireSpreadService.js';
import EvacuationService from '../services/EvacuationService.js';

const router = Router();

/**
 * @swagger
 * /api/map/risk-zones:
 *   get:
 *     tags: [Map]
 *     summary: Get risk zone GeoJSON for map rendering
 */
router.get('/risk-zones', optionalAuth, async (req, res, next) => {
  try {
    const { bbox, zoom } = req.query;
    const data = await GeoService.getRiskZones(bbox, zoom);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/heatmap', optionalAuth, async (req, res, next) => {
  try {
    const { bbox, resolution } = req.query;
    const data = await GeoService.getHeatmapData(bbox, resolution);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/hotspots', optionalAuth, async (req, res, next) => {
  try {
    const { bbox, hours } = req.query;
    const data = await SatelliteService.getHotspots(bbox, hours);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/fire-spread/:predictionId', authenticate, async (req, res, next) => {
  try {
    const data = await FireSpreadService.getSpreadTimeline(req.params.predictionId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/fire-spread/simulate', authenticate, async (req, res, next) => {
  try {
    const data = await FireSpreadService.simulate(req.body, req.app.get('io'));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/evacuation-routes', authenticate, async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.query;
    const data = await EvacuationService.getRoutes(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius) || 20
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/regions', optionalAuth, async (req, res, next) => {
  try {
    const data = await GeoService.getRegions(req.query.search);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/region/:id', optionalAuth, async (req, res, next) => {
  try {
    const data = await GeoService.getRegionDetail(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;