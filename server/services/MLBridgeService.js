import axios from 'axios';
import { getRedis } from '../config/redis.js';
import { CACHE_TTL } from '../config/constants.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 120000, // 2 minutes for heavy models
  headers: { 'Content-Type': 'application/json' },
});

class MLBridgeService {
  async healthCheck() {
    try {
      const { data } = await mlClient.get('/health');
      return data;
    } catch (err) {
      logger.error('ML service health check failed', err.message);
      throw new AppError('ML service is unavailable.', 503);
    }
  }

  async predict(payload) {
    try {
      const lat = payload.region.coordinates?.lat || payload.region.geometry?.coordinates?.[1];
      const lng = payload.region.coordinates?.lng || payload.region.geometry?.coordinates?.[0];
      logger.info(`Sending prediction request: model=${payload.model}, lat=${lat}, lng=${lng}`);
      logger.debug(`Full region object: ${JSON.stringify(payload.region)}`);
      const { data } = await mlClient.post('/predict', {
        location: {
          latitude: lat,
          longitude: lng,
          radius_km: payload.region.radius_km || 50,
        },
        time_horizon_hours: payload.timeframe?.horizonHours || 72,
        include_explainability: true,
      });
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      logger.error('ML prediction failed:', msg);
      throw new AppError(`ML prediction failed: ${msg}`, 502);
    }
  }

  async getExplanation(predictionData) {
    try {
      const { data } = await mlClient.post('/explain', predictionData);
      return data;
    } catch (err) {
      logger.error('ML explanation failed:', err.message);
      throw new AppError('Failed to generate explanation.', 502);
    }
  }

  async simulateFireSpread(params) {
    try {
      const { data } = await mlClient.post('/fire-spread/simulate', params);
      return data;
    } catch (err) {
      logger.error('Fire spread simulation failed:', err.message);
      throw new AppError('Fire spread simulation failed.', 502);
    }
  }

  async getModels() {
    const redis = getRedis();
    const cacheKey = 'ml:models';

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      const { data } = await mlClient.get('/models');
      await redis.setex(cacheKey, CACHE_TTL.LONG, JSON.stringify(data));
      return data;
    } catch (err) {
      logger.error('Failed to fetch ML models:', err.message);
      throw new AppError('Unable to fetch ML models.', 502);
    }
  }

  async triggerRetraining(params) {
    try {
      const { data } = await mlClient.post('/train', {
        model_type: params.model,
        dataset_id: params.datasetId,
        hyperparams: params.hyperparams,
      });
      return data;
    } catch (err) {
      logger.error('ML retraining trigger failed:', err.message);
      throw new AppError('Failed to trigger model retraining.', 502);
    }
  }

  async chat(message, context = {}) {
    try {
      const { data } = await mlClient.post('/pyrosage/chat', {
        query: message,
        context: context.context || context,
        conversation_id: context.conversationId || context.conversation_id,
        location: context.location,
      });
      return data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      logger.error('PyroSage chat failed:', msg);
      throw new AppError(`AI assistant is temporarily unavailable: ${msg}`, 502);
    }
  }

  async getFeatureEngineering(rawFeatures) {
    try {
      const { data } = await mlClient.post('/features/engineer', rawFeatures);
      return data;
    } catch (err) {
      logger.error('Feature engineering failed:', err.message);
      throw new AppError('Feature engineering failed.', 502);
    }
  }

  async estimateEmissions(params) {
    try {
      const { data } = await mlClient.post('/emissions/estimate', params);
      return data;
    } catch (err) {
      logger.error('Emissions estimation failed:', err.message);
      throw new AppError('Emissions estimation failed.', 502);
    }
  }

  async processSatelliteData(params) {
    try {
      const { data } = await mlClient.post('/satellite/process', params);
      return data;
    } catch (err) {
      logger.error('Satellite processing failed:', err.message);
      throw new AppError('Satellite data processing failed.', 502);
    }
  }
}

export default new MLBridgeService();