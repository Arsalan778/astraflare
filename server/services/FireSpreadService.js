import Prediction from '../models/Prediction.js';
import MLBridgeService from './MLBridgeService.js';
import { getRedis } from '../config/redis.js';
import { CACHE_TTL, WS_EVENTS } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

class FireSpreadService {
  /**
   * Get pre-computed spread timeline from a prediction.
   */
  async getSpreadTimeline(predictionId) {
    const redis = getRedis();
    const cacheKey = `firespread:${predictionId}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const prediction = await Prediction.findById(predictionId).select(
      'fireSpread region riskScore status'
    );

    if (!prediction) throw new AppError('Prediction not found.', 404);
    if (prediction.status !== 'completed') {
      throw new AppError('Prediction not yet completed.', 400);
    }

    if (
      !prediction.fireSpread ||
      !prediction.fireSpread.timesteps ||
      prediction.fireSpread.timesteps.length === 0
    ) {
      // Generate on-demand
      try {
        const result = await MLBridgeService.simulateFireSpread({
          region: prediction.region,
          risk_score: prediction.riskScore,
        });

        prediction.fireSpread = {
          simulationId: result.simulation_id,
          timesteps: result.timesteps || [],
        };
        await prediction.save();
      } catch (err) {
        logger.error('On-demand fire spread simulation failed', err.message);
        return {
          simulationId: null,
          timesteps: [],
          message: 'Simulation unavailable.',
        };
      }
    }

    const data = {
      predictionId: prediction._id,
      region: prediction.region,
      simulationId: prediction.fireSpread.simulationId,
      timesteps: prediction.fireSpread.timesteps,
      totalTimesteps: prediction.fireSpread.timesteps.length,
    };

    await redis.setex(cacheKey, CACHE_TTL.PREDICTION, JSON.stringify(data));
    return data;
  }

  /**
   * Run a new fire spread simulation with custom parameters.
   */
  async simulate(params, io) {
    const {
      lat,
      lng,
      windSpeed = 15,
      windDirection = 180,
      humidity = 30,
      temperature = 35,
      vegetationType = 'mixed',
      durationHours = 48,
      resolution = 'medium',
    } = params;

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required.', 400);
    }

    logger.info(
      `Fire spread simulation requested: (${lat}, ${lng}), ${durationHours}h`
    );

    const result = await MLBridgeService.simulateFireSpread({
      ignition_point: { lat: parseFloat(lat), lng: parseFloat(lng) },
      wind_speed: parseFloat(windSpeed),
      wind_direction: parseFloat(windDirection),
      humidity: parseFloat(humidity),
      temperature: parseFloat(temperature),
      vegetation_type: vegetationType,
      duration_hours: parseInt(durationHours),
      resolution,
    });

    // Emit simulation steps via WebSocket for live rendering
    if (io && result.timesteps) {
      for (let i = 0; i < result.timesteps.length; i++) {
        setTimeout(() => {
          io.emit(WS_EVENTS.FIRE_SPREAD, {
            simulationId: result.simulation_id,
            step: i,
            totalSteps: result.timesteps.length,
            data: result.timesteps[i],
          });
        }, i * 500); // 500ms between frames
      }
    }

    return {
      simulationId: result.simulation_id,
      ignitionPoint: { lat: parseFloat(lat), lng: parseFloat(lng) },
      parameters: {
        windSpeed,
        windDirection,
        humidity,
        temperature,
        vegetationType,
        durationHours,
      },
      timesteps: result.timesteps || [],
      summary: result.summary || {},
    };
  }

  /**
   * Estimate the potential burned area from a given point.
   */
  async estimateBurnArea(lat, lng, hoursAhead = 24) {
    try {
      const result = await MLBridgeService.simulateFireSpread({
        ignition_point: { lat, lng },
        duration_hours: hoursAhead,
        resolution: 'low',
        summary_only: true,
      });

      return {
        estimatedAreaKm2: result.summary?.total_area_km2 || 0,
        perimeterKm: result.summary?.perimeter_km || 0,
        maxSpreadRateKmh: result.summary?.max_spread_rate || 0,
        hoursAhead,
      };
    } catch (err) {
      logger.error('Burn area estimation failed', err.message);
      return {
        estimatedAreaKm2: 0,
        perimeterKm: 0,
        maxSpreadRateKmh: 0,
        hoursAhead,
        error: 'Estimation unavailable.',
      };
    }
  }
}

export default new FireSpreadService();