import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { QUEUE_NAMES } from '../config/constants.js';
import AlertService from '../services/AlertService.js';
import logger from '../config/logger.js';

let alertQueue = null;
let alertWorker = null;

export function getAlertQueue() {
  if (!alertQueue) {
    const connection = getRedis();

    alertQueue = new Queue(QUEUE_NAMES.ALERT, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 200 },
        removeOnFail: { age: 86400, count: 500 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    });

    logger.info('✅  Alert queue initialised');
  }
  return alertQueue;
}

export function startAlertWorker(io) {
  const connection = getRedis();

  alertWorker = new Worker(
    QUEUE_NAMES.ALERT,
    async (job) => {
      const { type, data } = job.data;
      logger.info(`Processing alert job: ${job.id}, type: ${type}`);

      switch (type) {
        case 'create_from_prediction': {
          const Prediction = (await import('../models/Prediction.js')).default;
          const prediction = await Prediction.findById(data.predictionId);
          if (prediction) {
            await AlertService.createFromPrediction(prediction, io);
          }
          break;
        }

        case 'expire_old_alerts': {
          const Alert = (await import('../models/Alert.js')).default;
          const result = await Alert.updateMany(
            {
              status: 'active',
              expiresAt: { $lte: new Date() },
            },
            { status: 'expired' }
          );
          logger.info(`Expired ${result.modifiedCount} old alerts`);
          break;
        }

        case 'send_notifications': {
          const Alert = (await import('../models/Alert.js')).default;
          const alert = await Alert.findById(data.alertId);
          if (alert) {
            await AlertService._notifyUsersEmail(alert);
          }
          break;
        }

        default:
          logger.warn(`Unknown alert job type: ${type}`);
      }

      return { success: true };
    },
    {
      connection,
      concurrency: 5,
    }
  );

  alertWorker.on('completed', (job) => {
    logger.info(`Alert job ${job.id} completed`);
  });

  alertWorker.on('failed', (job, err) => {
    logger.error(`Alert job ${job?.id} failed: ${err.message}`);
  });

  logger.info('✅  Alert worker started');
  return alertWorker;
}

export async function addAlertJob(type, data, options = {}) {
  const queue = getAlertQueue();
  const job = await queue.add('alert', { type, data }, options);
  return job;
}