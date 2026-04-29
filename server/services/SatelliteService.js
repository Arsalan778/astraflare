import axios from 'axios';
import { getRedis } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import MLBridgeService from './MLBridgeService.js';
import logger from '../config/logger.js';

const FIRMS_API_KEY = process.env.FIRMS_API_KEY;
const FIRMS_BASE_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

class SatelliteService {
  /**
   * Get hotspots from NASA FIRMS + any cached ML-processed data.
   */
  async getHotspots(bbox, hours = 24) {
    const redis = getRedis();
    const cacheKey = `satellite:hotspots:${bbox}:${hours}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let hotspots = [];

    // Try NASA FIRMS API
    if (FIRMS_API_KEY && bbox) {
      try {
        hotspots = await this._fetchFIRMS(bbox, hours);
      } catch (err) {
        logger.warn('FIRMS API fetch failed, falling back to ML service', err.message);
      }
    }

    // Fallback / supplement with ML service
    if (hotspots.length === 0) {
      try {
        const mlData = await MLBridgeService.processSatelliteData({
          bbox,
          hours,
          source: 'firms',
        });
        hotspots = mlData.hotspots || [];
      } catch (err) {
        logger.error('ML satellite processing also failed', err.message);
      }
    }

    const result = {
      type: 'FeatureCollection',
      metadata: {
        source: 'NASA FIRMS / MODIS',
        hoursBack: parseInt(hours),
        fetchedAt: new Date().toISOString(),
        count: hotspots.length,
      },
      features: hotspots.map((h) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [h.longitude || h.lng, h.latitude || h.lat],
        },
        properties: {
          brightness: h.brightness || h.bright_ti4,
          frp: h.frp || 0,
          confidence: h.confidence,
          satellite: h.satellite || 'MODIS',
          acqDate: h.acq_date,
          acqTime: h.acq_time,
          dayNight: h.daynight,
        },
      })),
    };

    await redis.setex(cacheKey, CACHE_TTL.SATELLITE, JSON.stringify(result));
    return result;
  }

  async _fetchFIRMS(bbox, hours) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
    const days = Math.max(1, Math.ceil(parseInt(hours) / 24));

    const url = `${FIRMS_BASE_URL}/${FIRMS_API_KEY}/MODIS_NRT/${minLng},${minLat},${maxLng},${maxLat}/${days}`;

    const response = await axios.get(url, { timeout: 30000 });
    const lines = response.data.split('\n').filter((l) => l.trim());

    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    const hotspots = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      const obj = {};
      headers.forEach((h, idx) => {
        obj[h.trim()] = values[idx]?.trim();
      });

      hotspots.push({
        latitude: parseFloat(obj.latitude),
        longitude: parseFloat(obj.longitude),
        brightness: parseFloat(obj.brightness) || null,
        bright_ti4: parseFloat(obj.bright_ti4) || null,
        frp: parseFloat(obj.frp) || 0,
        confidence: parseInt(obj.confidence) || 0,
        satellite: obj.satellite || 'MODIS',
        acq_date: obj.acq_date,
        acq_time: obj.acq_time,
        daynight: obj.daynight,
      });
    }

    return hotspots;
  }

  /**
   * Get satellite imagery analysis for a specific region.
   */
  async getImageryAnalysis(region) {
    const redis = getRedis();
    const cacheKey = `satellite:imagery:${JSON.stringify(region)}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const result = await MLBridgeService.processSatelliteData({
        region,
        analysis_type: 'full',
      });

      await redis.setex(cacheKey, CACHE_TTL.SATELLITE, JSON.stringify(result));
      return result;
    } catch (err) {
      logger.error('Satellite imagery analysis failed', err.message);
      return { error: 'Analysis unavailable', region };
    }
  }

  /**
   * Get NDVI (vegetation index) data for a region.
   */
  async getNDVI(bbox) {
    const redis = getRedis();
    const cacheKey = `satellite:ndvi:${bbox}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const result = await MLBridgeService.processSatelliteData({
        bbox,
        analysis_type: 'ndvi',
      });

      await redis.setex(cacheKey, CACHE_TTL.LONG, JSON.stringify(result));
      return result;
    } catch (err) {
      logger.error('NDVI fetch failed', err.message);
      return { error: 'NDVI data unavailable' };
    }
  }
}

export default new SatelliteService();