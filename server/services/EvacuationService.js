import { getRedis } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';

class EvacuationService {
  /**
   * Get evacuation routes around a danger point.
   * In production this would use a routing engine (OSRM, Mapbox Directions, etc.)
   */
  async getRoutes(lat, lng, radiusKm = 20) {
    const redis = getRedis();
    const cacheKey = `evacuation:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Generate synthetic evacuation routes based on cardinal directions.
    // In production, replace with real routing API calls.
    const routes = this._generateRoutes(lat, lng, radiusKm);

    const result = {
      dangerZone: {
        center: { lat, lng },
        radiusKm,
      },
      routes,
      shelters: this._getNearestShelters(lat, lng, radiusKm),
      generatedAt: new Date().toISOString(),
      disclaimer:
        'These routes are estimated. Always follow official evacuation orders from local authorities.',
    };

    await redis.setex(cacheKey, CACHE_TTL.SHORT, JSON.stringify(result));
    return result;
  }

  _generateRoutes(lat, lng, radiusKm) {
    const directions = [
      { name: 'North Route', bearing: 0 },
      { name: 'Northeast Route', bearing: 45 },
      { name: 'East Route', bearing: 90 },
      { name: 'Southeast Route', bearing: 135 },
      { name: 'South Route', bearing: 180 },
      { name: 'Southwest Route', bearing: 225 },
      { name: 'West Route', bearing: 270 },
      { name: 'Northwest Route', bearing: 315 },
    ];

    const R = 6371; // Earth radius in km

    return directions.map((dir) => {
      const waypoints = [];
      const steps = 5;

      for (let i = 0; i <= steps; i++) {
        const dist = (radiusKm / steps) * i + radiusKm * 0.5;
        const point = this._destinationPoint(lat, lng, dist, dir.bearing, R);
        waypoints.push({
          lat: point.lat,
          lng: point.lng,
          distanceFromOriginKm: parseFloat(dist.toFixed(2)),
        });
      }

      const totalDistKm = radiusKm * 1.5 + Math.random() * 5;
      const estimatedMinutes = Math.round((totalDistKm / 60) * 60 + Math.random() * 15);

      return {
        name: dir.name,
        bearing: dir.bearing,
        distanceKm: parseFloat(totalDistKm.toFixed(2)),
        estimatedMinutes,
        congestionLevel: this._randomCongestion(),
        roadType: this._randomRoadType(),
        waypoints,
        geometry: {
          type: 'LineString',
          coordinates: waypoints.map((w) => [w.lng, w.lat]),
        },
      };
    });
  }

  _destinationPoint(lat, lng, distKm, bearingDeg, R) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    const lat1 = toRad(lat);
    const lng1 = toRad(lng);
    const bearing = toRad(bearingDeg);
    const d = distKm / R;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) +
        Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
    );

    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
        Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
      );

    return {
      lat: parseFloat(toDeg(lat2).toFixed(6)),
      lng: parseFloat(toDeg(lng2).toFixed(6)),
    };
  }

  _getNearestShelters(lat, lng, radiusKm) {
    // Simulated shelters — replace with real database/API in production.
    const R = 6371;
    const shelterTemplates = [
      { name: 'Community Center', type: 'shelter', capacity: 500 },
      { name: 'High School Gymnasium', type: 'shelter', capacity: 1200 },
      { name: 'Fire Station #12', type: 'staging_area', capacity: 100 },
      { name: 'City Park Evacuation Point', type: 'evacuation_point', capacity: 2000 },
      { name: 'Hospital Emergency Ward', type: 'medical', capacity: 300 },
    ];

    return shelterTemplates.map((template, i) => {
      const bearing = (i * 72) % 360; // evenly spaced
      const dist = radiusKm * 0.6 + Math.random() * radiusKm * 0.8;
      const point = this._destinationPoint(lat, lng, dist, bearing, R);

      return {
        ...template,
        lat: point.lat,
        lng: point.lng,
        distanceKm: parseFloat(dist.toFixed(2)),
        status: 'open',
        contact: '+1-555-000-' + String(1000 + i),
      };
    });
  }

  _randomCongestion() {
    const levels = ['low', 'moderate', 'high'];
    return levels[Math.floor(Math.random() * levels.length)];
  }

  _randomRoadType() {
    const types = ['highway', 'major_road', 'secondary_road', 'rural_road'];
    return types[Math.floor(Math.random() * types.length)];
  }
}

export default new EvacuationService();