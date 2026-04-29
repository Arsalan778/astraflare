import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { QUEUE_NAMES } from '../config/constants.js';
import PredictionService from '../services/PredictionService.js';
import logger from '../config/logger.js';

let predictionQueue = null;
let predictionWorker = null;

export function getPredictionQueue() {
  if (!predictionQueue) {
    const connection = getRedis();

    predictionQueue = new Queue(QUEUE_NAMES.PREDICTION, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400, count: 500 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    logger.info('✅  Prediction queue initialised');
  }
  return predictionQueue;
}

export function startPredictionWorker(io) {
  const connection = getRedis();

  predictionWorker = new Worker(
    QUEUE_NAMES.PREDICTION,
    async (job) => {
      const { predictionId } = job.data;
      logger.info(`Processing prediction job: ${job.id}, prediction: ${predictionId}`);

      try {
        const Prediction = (await import('../models/Prediction.js')).default;
        const prediction = await Prediction.findById(predictionId);
        if (!prediction) {
          throw new Error(`Prediction ${predictionId} not found`);
        }

        await PredictionService._processAsync(prediction, io);
        return { success: true, predictionId };
      } catch (err) {
        logger.error(`Prediction job ${job.id} failed:`, err.message);
        throw err;
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.PREDICTION_CONCURRENCY) || 3,
      limiter: {
        max: 10,
        duration: 60000, // 10 per minute
      },
    }
  );

  predictionWorker.on('completed', (job) => {
    logger.info(`Prediction job ${job.id} completed`);
  });

  predictionWorker.on('failed', (job, err) => {
    logger.error(`Prediction job ${job?.id} failed: ${err.message}`);
  });

  predictionWorker.on('error', (err) => {
    logger.error('Prediction worker error:', err);
  });

  logger.info('✅  Prediction worker started');
  return predictionWorker;
}

export async function addPredictionJob(predictionId, options = {}) {
  const queue = getPredictionQueue();
  const job = await queue.add(
    'predict',
    { predictionId },
    {
      priority: options.priority || 5,
      delay: options.delay || 0,
    }
  );
  logger.info(`Prediction job ${job.id} added for prediction ${predictionId}`);
  return job;
}