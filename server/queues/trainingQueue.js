import { Queue, Worker } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { QUEUE_NAMES, WS_EVENTS } from '../config/constants.js';
import logger from '../config/logger.js';

let trainingQueue = null;
let trainingWorker = null;

export function getTrainingQueue() {
  if (!trainingQueue) {
    const connection = getRedis();

    trainingQueue = new Queue(QUEUE_NAMES.TRAINING, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 86400, count: 20 },
        removeOnFail: { age: 86400 * 7, count: 50 },
        attempts: 1,
        timeout: 3600000, // 1 hour
      },
    });

    logger.info('✅  Training queue initialised');
  }
  return trainingQueue;
}

export function startTrainingWorker(io) {
  const connection = getRedis();

  trainingWorker = new Worker(
    QUEUE_NAMES.TRAINING,
    async (job) => {
      const { modelType, datasetId, hyperparams, triggeredBy } = job.data;

      logger.info(
        `[TrainingWorker] Job ${job.id} started — model=${modelType} dataset=${datasetId}`
      );

      const MLBridgeService = (await import('../services/MLBridgeService.js')).default;

      if (io) {
        io.emit(WS_EVENTS.SYSTEM_STATUS, {
          type: 'training_started',
          modelType,
          jobId: job.id,
          timestamp: new Date().toISOString(),
        });
      }

      await job.updateProgress(5);

      const result = await MLBridgeService.triggerRetraining({
        model: modelType,
        datasetId,
        hyperparams,
      });

      await job.updateProgress(100);

      if (io) {
        io.emit(WS_EVENTS.SYSTEM_STATUS, {
          type: 'training_completed',
          modelType,
          jobId: job.id,
          metrics: result.metrics || {},
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(
        `[TrainingWorker] Job ${job.id} completed — model=${modelType}`
      );

      return { success: true, modelType, metrics: result.metrics };
    },
    {
      connection,
      concurrency: 1, // only one training job at a time
    }
  );

  trainingWorker.on('completed', (job, result) => {
    logger.info(`[TrainingWorker] ✅ Job ${job.id} completed`);
  });

  trainingWorker.on('failed', (job, err) => {
    logger.error(`[TrainingWorker] ❌ Job ${job?.id} failed: ${err.message}`);

    if (io) {
      io.emit(WS_EVENTS.SYSTEM_STATUS, {
        type: 'training_failed',
        modelType: job?.data?.modelType,
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  logger.info('✅  Training worker started');
  return trainingWorker;
}

export async function addTrainingJob(modelType, datasetId, hyperparams, triggeredBy) {
  const queue = getTrainingQueue();
  const job = await queue.add(
    `train:${modelType}`,
    { modelType, datasetId, hyperparams, triggeredBy },
    { jobId: `train-${modelType}-${Date.now()}` }
  );
  logger.info(`[TrainingQueue] Job ${job.id} added — model=${modelType}`);
  return job;
}

export async function shutdownTrainingQueue() {
  if (trainingWorker) await trainingWorker.close();
  if (trainingQueue) await trainingQueue.close();
}