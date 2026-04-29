import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedis } from '../config/redis.js';
import { QUEUE_NAMES, WS_EVENTS } from '../config/constants.js';
import logger from '../config/logger.js';

let reportQueue = null;
let reportWorker = null;
let reportEvents = null;

// ── Queue ───────────────────────────────────────────────────────

export function getReportQueue() {
  if (!reportQueue) {
    const connection = getRedis();

    reportQueue = new Queue(QUEUE_NAMES.REPORT, {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 7200, count: 50 },
        removeOnFail: { age: 86400, count: 100 },
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        timeout: 300000, // 5 minutes
      },
    });

    reportQueue.on('error', (err) => {
      logger.error('Report queue error:', err.message);
    });

    logger.info('✅  Report queue initialised');
  }
  return reportQueue;
}

// ── Queue Events ────────────────────────────────────────────────

export function getReportEvents() {
  if (!reportEvents) {
    const connection = getRedis();
    reportEvents = new QueueEvents(QUEUE_NAMES.REPORT, { connection });

    reportEvents.on('completed', ({ jobId }) => {
      logger.info(`[ReportEvents] Job ${jobId} completed`);
    });

    reportEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`[ReportEvents] Job ${jobId} failed: ${failedReason}`);
    });

    reportEvents.on('progress', ({ jobId, data: progress }) => {
      logger.debug(`[ReportEvents] Job ${jobId} progress: ${progress}%`);
    });
  }
  return reportEvents;
}

// ── Worker ──────────────────────────────────────────────────────

export function startReportWorker(io) {
  const connection = getRedis();

  reportWorker = new Worker(
    QUEUE_NAMES.REPORT,
    async (job) => {
      const {
        type,
        reportId,
        userId,
        userEmail,
        userFirstName,
        data: jobPayload,
      } = job.data;

      const jobType = type || 'generate';

      logger.info(
        `[ReportWorker] Job ${job.id} started — type=${jobType} report=${reportId || 'N/A'}`
      );

      switch (jobType) {
        // ── Generate a single report ────────────────────────
        case 'generate': {
          const Report = (await import('../models/Report.js')).default;
          const ReportService = (await import('../services/ReportService.js')).default;
          const EmailService = (await import('../services/EmailService.js')).default;

          const report = await Report.findById(reportId);
          if (!report) {
            throw new Error(`Report ${reportId} not found in database`);
          }

          await job.updateProgress(5);

          // Notify user that generation started
          if (io && userId) {
            io.to(`user:${userId}`).emit(WS_EVENTS.SYSTEM_STATUS, {
              type: 'report_generating',
              reportId,
              title: report.title,
              progress: 5,
              timestamp: new Date().toISOString(),
            });
          }

          // Generate the report (calls _generateAsync internally)
          try {
            await ReportService._generateAsync(report);
          } catch (genErr) {
            // Mark as error if generation fails
            report.status = 'error';
            report.metadata = report.metadata || new Map();
            report.metadata.set('error', genErr.message);
            report.metadata.set('failedAt', new Date().toISOString());
            await report.save();

            if (io && userId) {
              io.to(`user:${userId}`).emit(WS_EVENTS.SYSTEM_STATUS, {
                type: 'report_failed',
                reportId,
                error: genErr.message,
                timestamp: new Date().toISOString(),
              });
            }

            throw genErr;
          }

          await job.updateProgress(85);

          // Notify via WebSocket
          if (io && userId) {
            io.to(`user:${userId}`).emit(WS_EVENTS.SYSTEM_STATUS, {
              type: 'report_ready',
              reportId,
              title: report.title,
              format: report.format,
              timestamp: new Date().toISOString(),
            });
          }

          await job.updateProgress(90);

          // Send email notification
          if (userEmail && userFirstName) {
            try {
              await EmailService.sendReportReady(userEmail, userFirstName, report);
              logger.info(`[ReportWorker] Email sent to ${userEmail} for report ${reportId}`);
            } catch (emailErr) {
              logger.error(
                `[ReportWorker] Email for report ${reportId} failed: ${emailErr.message}`
              );
              // Don't fail the whole job because of email
            }
          }

          await job.updateProgress(100);

          logger.info(
            `[ReportWorker] Report ${reportId} generated — status=${report.status} format=${report.format}`
          );

          return {
            success: true,
            reportId,
            status: report.status,
            format: report.format,
            title: report.title,
          };
        }

        // ── Bulk report generation ──────────────────────────
        case 'bulk_generate': {
          const Report = (await import('../models/Report.js')).default;
          const ReportService = (await import('../services/ReportService.js')).default;

          const { regions, dateRange, format, reportType } = jobPayload;

          if (!regions || !Array.isArray(regions) || regions.length === 0) {
            throw new Error('bulk_generate requires a non-empty regions array');
          }

          const results = [];
          const totalRegions = regions.length;

          for (let i = 0; i < totalRegions; i++) {
            const region = regions[i];

            try {
              const report = await Report.create({
                title: `${reportType || 'Risk Assessment'} — ${region.name}`,
                type: reportType || 'risk_assessment',
                region,
                dateRange: dateRange || {
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  end: new Date(),
                },
                format: format || 'pdf',
                generatedBy: userId,
                status: 'generating',
              });

              await ReportService._generateAsync(report);

              results.push({
                regionName: region.name,
                reportId: report._id,
                status: report.status,
              });
            } catch (err) {
              results.push({
                regionName: region.name,
                reportId: null,
                status: 'error',
                error: err.message,
              });
            }

            const progress = Math.round(((i + 1) / totalRegions) * 100);
            await job.updateProgress(progress);

            if (io && userId) {
              io.to(`user:${userId}`).emit(WS_EVENTS.SYSTEM_STATUS, {
                type: 'bulk_report_progress',
                completed: i + 1,
                total: totalRegions,
                progress,
                currentRegion: region.name,
              });
            }
          }

          const successCount = results.filter((r) => r.status === 'ready').length;
          const failCount = results.filter((r) => r.status === 'error').length;

          logger.info(
            `[ReportWorker] Bulk generation completed: ${successCount} success, ${failCount} failed out of ${totalRegions}`
          );

          return {
            success: true,
            totalRegions,
            successCount,
            failCount,
            results,
          };
        }

        // ── Scheduled periodic report ───────────────────────
        case 'scheduled_report': {
          const Report = (await import('../models/Report.js')).default;
          const ReportService = (await import('../services/ReportService.js')).default;
          const EmailService = (await import('../services/EmailService.js')).default;
          const User = (await import('../models/User.js')).default;

          const {
            reportType: schedType,
            periodDays,
            recipientRoles,
          } = jobPayload;

          const periodMs = (periodDays || 30) * 24 * 60 * 60 * 1000;

          const report = await Report.create({
            title: `${schedType || 'Monthly Summary'} — ${new Date().toISOString().split('T')[0]}`,
            type: schedType || 'monthly_summary',
            dateRange: {
              start: new Date(Date.now() - periodMs),
              end: new Date(),
            },
            format: 'pdf',
            generatedBy: null, // system-generated
            status: 'generating',
          });

          await job.updateProgress(10);

          await ReportService._generateAsync(report);

          await job.updateProgress(70);

          // Send to all admins / analysts
          const roles = recipientRoles || ['admin', 'super_admin', 'analyst'];
          const recipients = await User.find({
            role: { $in: roles },
            isActive: true,
            'preferences.notifications.email': true,
          }).select('email firstName');

          let emailsSent = 0;
          for (const user of recipients) {
            try {
              await EmailService.sendReportReady(user.email, user.firstName, report);
              emailsSent++;
            } catch {
              // skip
            }
          }

          await job.updateProgress(100);

          logger.info(
            `[ReportWorker] Scheduled report ${report._id} generated, sent to ${emailsSent}/${recipients.length} recipients`
          );

          return {
            success: true,
            reportId: report._id,
            emailsSent,
            recipientCount: recipients.length,
          };
        }

        // ── Cleanup old reports from disk ───────────────────
        case 'cleanup_old_reports': {
          const Report = (await import('../models/Report.js')).default;
          const fs = (await import('fs/promises')).default;

          const retentionDays = jobPayload?.retentionDays || 90;
          const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

          const oldReports = await Report.find({
            createdAt: { $lte: cutoff },
            filePath: { $exists: true, $ne: null },
          }).select('filePath');

          let deletedFiles = 0;
          let deletedRecords = 0;

          for (const report of oldReports) {
            if (report.filePath) {
              try {
                await fs.unlink(report.filePath);
                deletedFiles++;
              } catch {
                // file may already be gone
              }
            }
          }

          const deleteResult = await Report.deleteMany({
            createdAt: { $lte: cutoff },
          });
          deletedRecords = deleteResult.deletedCount;

          logger.info(
            `[ReportWorker] Cleanup: ${deletedFiles} files, ${deletedRecords} records (older than ${retentionDays} days)`
          );

          return {
            success: true,
            deletedFiles,
            deletedRecords,
            retentionDays,
          };
        }

        // ── Unknown ─────────────────────────────────────────
        default:
          logger.warn(`[ReportWorker] Unknown job type: ${jobType}`);
          return { success: false, reason: `Unknown job type: ${jobType}` };
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.REPORT_CONCURRENCY) || 2,
      limiter: {
        max: 5,
        duration: 60000, // 5 per minute
      },
      stalledInterval: 120000,
      maxStalledCount: 1,
    }
  );

  // ── Worker lifecycle events ─────────────────────────────────

  reportWorker.on('completed', (job, result) => {
    logger.info(
      `[ReportWorker] ✅ Job ${job.id} (${job.data.type || 'generate'}) completed — report=${result?.reportId || 'bulk'}`
    );
  });

  reportWorker.on('failed', (job, err) => {
    logger.error(
      `[ReportWorker] ❌ Job ${job?.id} (${job?.data?.type || 'generate'}) failed (attempt ${job?.attemptsMade}): ${err.message}`
    );

    // Notify user on failure
    if (io && job?.data?.userId) {
      io.to(`user:${job.data.userId}`).emit(WS_EVENTS.SYSTEM_STATUS, {
        type: 'report_failed',
        reportId: job.data.reportId,
        error: err.message,
        isFinal: job.attemptsMade >= (job.opts?.attempts || 2),
        timestamp: new Date().toISOString(),
      });
    }
  });

  reportWorker.on('progress', (job, progress) => {
    logger.debug(`[ReportWorker] Job ${job.id} progress: ${progress}%`);

    if (io && job.data?.userId) {
      io.to(`user:${job.data.userId}`).emit(WS_EVENTS.SYSTEM_STATUS, {
        type: 'report_progress',
        reportId: job.data.reportId,
        progress,
        timestamp: new Date().toISOString(),
      });
    }
  });

  reportWorker.on('stalled', (jobId) => {
    logger.warn(`[ReportWorker] ⚠️ Job ${jobId} stalled`);
  });

  reportWorker.on('error', (err) => {
    logger.error('[ReportWorker] Worker error:', err.message);
  });

  logger.info('✅  Report worker started');
  return reportWorker;
}

// ── Job Helpers ─────────────────────────────────────────────────

export async function addReportJob(reportId, user, options = {}) {
  const queue = getReportQueue();

  const job = await queue.add(
    `report:generate:${reportId}`,
    {
      type: 'generate',
      reportId,
      userId: user._id?.toString() || user.id,
      userEmail: user.email,
      userFirstName: user.firstName,
    },
    {
      priority: options.priority || 5,
      delay: options.delay || 0,
      jobId: `report-${reportId}`,
    }
  );

  logger.info(
    `[ReportQueue] Job ${job.id} added — type=generate report=${reportId}`
  );
  return job;
}

export async function addBulkReportJob(regions, dateRange, format, user, options = {}) {
  const queue = getReportQueue();

  const job = await queue.add(
    'report:bulk_generate',
    {
      type: 'bulk_generate',
      userId: user._id?.toString() || user.id,
      userEmail: user.email,
      userFirstName: user.firstName,
      data: {
        regions,
        dateRange,
        format: format || 'pdf',
        reportType: options.reportType || 'risk_assessment',
      },
    },
    {
      priority: options.priority || 8, // lower priority than single
      jobId: `bulk-report-${Date.now()}`,
    }
  );

  logger.info(
    `[ReportQueue] Bulk job ${job.id} added — ${regions.length} regions`
  );
  return job;
}

export async function schedulePeriodicReport(periodDays = 30, recipientRoles) {
  const queue = getReportQueue();

  const job = await queue.add(
    'report:scheduled',
    {
      type: 'scheduled_report',
      data: {
        reportType: 'monthly_summary',
        periodDays,
        recipientRoles: recipientRoles || ['admin', 'super_admin', 'analyst'],
      },
    },
    {
      repeat: {
        every: periodDays * 24 * 60 * 60 * 1000,
      },
      jobId: `scheduled-report-${periodDays}d`,
    }
  );

  logger.info(
    `[ReportQueue] Scheduled periodic report every ${periodDays} days`
  );
  return job;
}

export async function scheduleReportCleanup(retentionDays = 90) {
  const queue = getReportQueue();

  const job = await queue.add(
    'report:cleanup',
    {
      type: 'cleanup_old_reports',
      data: { retentionDays },
    },
    {
      repeat: {
        every: 7 * 24 * 60 * 60 * 1000, // weekly
      },
      jobId: 'scheduled-report-cleanup',
    }
  );

  logger.info(
    `[ReportQueue] Scheduled weekly report cleanup (retention=${retentionDays} days)`
  );
  return job;
}

export async function getReportJobStatus(reportId) {
  const queue = getReportQueue();
  const jobId = `report-${reportId}`;

  const job = await queue.getJob(jobId);
  if (!job) {
    return { exists: false, reportId };
  }

  const state = await job.getState();

  return {
    exists: true,
    reportId,
    jobId: job.id,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    returnValue: job.returnvalue,
  };
}

export async function getReportQueueStats() {
  const queue = getReportQueue();

  const [waiting, active, completed, failed, delayed, paused] =
    await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

  const repeatableJobs = await queue.getRepeatableJobs();

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + completed + failed + delayed + paused,
    repeatableJobs: repeatableJobs.map((rj) => ({
      name: rj.name,
      id: rj.id,
      every: rj.every,
      next: rj.next,
    })),
  };
}

export async function cleanReportQueue(grace = 7200000, limit = 50) {
  const queue = getReportQueue();

  const [cleanedCompleted, cleanedFailed] = await Promise.all([
    queue.clean(grace, limit, 'completed'),
    queue.clean(grace, limit, 'failed'),
  ]);

  logger.info(
    `[ReportQueue] Cleaned ${cleanedCompleted.length} completed, ${cleanedFailed.length} failed jobs`
  );

  return {
    cleanedCompleted: cleanedCompleted.length,
    cleanedFailed: cleanedFailed.length,
  };
}

// ── Graceful shutdown ───────────────────────────────────────────

export async function shutdownReportQueue() {
  if (reportWorker) {
    await reportWorker.close();
    logger.info('[ReportQueue] Worker closed');
  }
  if (reportEvents) {
    await reportEvents.close();
    logger.info('[ReportQueue] Events listener closed');
  }
  if (reportQueue) {
    await reportQueue.close();
    logger.info('[ReportQueue] Queue closed');
  }
}