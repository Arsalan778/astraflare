import axios from 'axios';
import Prediction from '../models/Prediction.js';
import { getRedis } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import logger from '../config/logger.js';

class GeoService {
  async getRiskZones(bbox, zoom) {
    const redis = getRedis();
    const cacheKey = `map:riskzones:${bbox}:${zoom}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filter = {
      status: 'completed',
      riskScore: { $gt: 0 },
    };

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      filter['region.geometry'] = {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
        },
      };
    }

    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .select('region riskScore riskLevel confidence createdAt')
      .lean();

    const geojson = {
      type: 'FeatureCollection',
      features: predictions.map((p) => ({
        type: 'Feature',
        geometry: p.region.geometry,
        properties: {
          id: p._id,
          name: p.region.name,
          riskScore: p.riskScore,
          riskLevel: p.riskLevel,
          confidence: p.confidence,
          predictionDate: p.createdAt,
        },
      })),
    };

    await redis.setex(cacheKey, CACHE_TTL.MAP_DATA, JSON.stringify(geojson));
    return geojson;
  }

  async getHeatmapData(bbox, resolution) {
    const redis = getRedis();
    const cacheKey = `map:heatmap:${bbox}:${resolution}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const filter = { status: 'completed', riskScore: { $gt: 0.1 } };

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      filter['region.geometry'] = {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
        },
      };
    }

    const points = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .limit(1000)
      .select('region.geometry.coordinates riskScore')
      .lean();

    const heatmapData = points.map((p) => {
      const coords = p.region?.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;
      return {
        lat: coords[1],
        lng: coords[0],
        weight: p.riskScore,
      };
    }).filter(Boolean);

    await redis.setex(cacheKey, CACHE_TTL.MAP_DATA, JSON.stringify(heatmapData));
    return heatmapData;
  }

  async getRegions(search) {
    const redis = getRedis();
    const cacheKey = `map:regions:global:${search || 'all'}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let results = [];

    // 1. Search existing predictions in DB
    const pipeline = [
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$region.name',
          latestRisk: { $last: '$riskScore' },
          latestLevel: { $last: '$riskLevel' },
          geometry: { $last: '$region.geometry' },
          bbox: { $last: '$region.bbox' },
        },
      },
      { $limit: 20 },
    ];

    if (search) {
      pipeline.unshift({
        $match: { 'region.name': { $regex: search, $options: 'i' } },
      });
    }

    const localRegions = await Prediction.aggregate(pipeline);
    results = localRegions.map((r) => ({
      id: `local-${r._id}`,
      name: r._id,
      riskLevel: r.latestLevel,
      coordinates: {
        lat: r.geometry.coordinates[1],
        lng: r.geometry.coordinates[0],
      },
      geometry: r.geometry,
      bbox: r.bbox,
      type: 'historical',
    }));

    // 2. If search is provided, call Mapbox Geocoding for global results
    if (search && search.length > 2) {
      try {
        const token = process.env.MAPBOX_TOKEN;
        if (token && token !== 'pk.your_mapbox_token') {
          const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            search
          )}.json?access_token=${token}&limit=5`;
          
          const { data } = await axios.get(geocodeUrl);
          
          const globalResults = data.features.map((f) => ({
            id: f.id,
            name: f.text,
            state: f.context?.map((c) => c.text).join(', ') || f.place_name,
            coordinates: {
              lat: f.center[1],
              lng: f.center[0],
            },
            geometry: f.geometry,
            bbox: f.bbox || [
              f.center[0] - 0.1,
              f.center[1] - 0.1,
              f.center[0] + 0.1,
              f.center[1] + 0.1,
            ],
            type: 'global',
          }));
          
          // Merge results, avoiding duplicates by name
          const names = new Set(results.map((r) => r.name.toLowerCase()));
          globalResults.forEach((gr) => {
            if (!names.has(gr.name.toLowerCase())) {
              results.push(gr);
            }
          });
        }
      } catch (err) {
        logger.error('Mapbox geocoding failed:', err.message);
      }
    }

    await redis.setex(cacheKey, CACHE_TTL.MEDIUM, JSON.stringify(results));
    return results;
  }

  async getRegionDetail(regionName) {
    const predictions = await Prediction.find({
      'region.name': regionName,
      status: 'completed',
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    if (!predictions.length) {
      return { name: regionName, predictions: [], stats: null };
    }

    const latest = predictions[0];
    const riskHistory = predictions.map((p) => ({
      date: p.createdAt,
      riskScore: p.riskScore,
      riskLevel: p.riskLevel,
    }));

    return {
      name: regionName,
      geometry: latest.region.geometry,
      current: {
        riskScore: latest.riskScore,
        riskLevel: latest.riskLevel,
        confidence: latest.confidence,
        features: latest.features,
        weather: latest.weather,
      },
      riskHistory,
      predictionCount: predictions.length,
    };
  }
}

export default new GeoService();