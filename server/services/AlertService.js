import Alert from '../models/Alert.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../middleware/errorHandler.js';
import { WS_EVENTS, PAGINATION, ALERT_SEVERITY, RISK_THRESHOLDS } from '../config/constants.js';
import EmailService from './EmailService.js';
import logger from '../config/logger.js';

class AlertService {
  async list(query, user) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      severity,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const filter = {};
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const effectiveLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

    const [data, total] = await Promise.all([
      Alert.find(filter)
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(effectiveLimit)
        .populate('createdBy', 'firstName lastName')
        .populate('acknowledgedBy', 'firstName lastName')
        .populate('resolvedBy', 'firstName lastName'),
      Alert.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: effectiveLimit,
        total,
        pages: Math.ceil(total / effectiveLimit),
      },
    };
  }

  async getActive(query) {
    const filter = { status: 'active' };
    if (query.severity) filter.severity = query.severity;

    if (query.bbox) {
      const [minLng, minLat, maxLng, maxLat] = query.bbox.split(',').map(Number);
      filter['region.geometry'] = {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
        },
      };
    }

    const alerts = await Alert.find(filter)
      .sort({ severity: -1, createdAt: -1 })
      .limit(100)
      .lean();

    return alerts;
  }

  async getById(id) {
    const alert = await Alert.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('acknowledgedBy', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName')
      .populate('predictionId');

    if (!alert) throw new AppError('Alert not found.', 404);
    return alert;
  }

  async createManual(data, userId, io) {
    const alert = await Alert.create({
      title: data.title,
      message: data.message,
      severity: data.severity,
      region: data.region,
      triggeredBy: 'manual',
      createdBy: userId,
      expiresAt: data.expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000),
      metadata: data.metadata,
    });

    // Create notifications for relevant users
    if (io) {
      this._createNotificationsForAlert(alert, io).catch((err) =>
        logger.error('Failed to create notifications for manual alert', err)
      );
    }

    // Notify users by email if critical or emergency
    if (['critical', 'emergency'].includes(alert.severity)) {
      this._notifyUsersEmail(alert).catch((err) =>
        logger.error('Alert email notification failed', err)
      );
    }

    logger.info(`Manual alert created: ${alert._id} severity=${alert.severity}`);
    return alert;
  }

  async createFromPrediction(prediction, io) {
    const severity = this._scoreSeverity(prediction.riskScore);

    const existingActive = await Alert.findOne({
      'region.name': prediction.region.name,
      status: 'active',
      severity: { $in: ['critical', 'emergency'] },
      createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    });

    if (existingActive) {
      logger.info(
        `Skipping duplicate alert for ${prediction.region.name}, active=${existingActive._id}`
      );
      return existingActive;
    }

    const alert = await Alert.create({
      title: `${severity.toUpperCase()} Fire Risk: ${prediction.region.name}`,
      message: `Automated alert: Risk score ${(prediction.riskScore * 100).toFixed(1)}% detected for ${prediction.region.name}. Model confidence: ${(prediction.confidence * 100).toFixed(1)}%.`,
      severity,
      status: 'active',
      region: prediction.region,
      predictionId: prediction._id,
      riskScore: prediction.riskScore,
      triggeredBy: 'system',
      expiresAt: new Date(
        Date.now() + prediction.timeframe.horizonHours * 60 * 60 * 1000
      ),
    });

    if (io) {
      this._createNotificationsForAlert(alert, io).catch((err) =>
        logger.error('Failed to create notifications for system alert', err)
      );
    }

    if (['critical', 'emergency'].includes(severity)) {
      this._notifyUsersEmail(alert).catch((err) =>
        logger.error('Alert email notification failed', err)
      );
    }

    logger.info(
      `Auto-alert created: ${alert._id} for prediction ${prediction._id}`
    );
    return alert;
  }

  async acknowledge(alertId, userId, io) {
    const alert = await Alert.findById(alertId);
    if (!alert) throw new AppError('Alert not found.', 404);

    if (alert.status !== 'active') {
      throw new AppError(`Alert is already ${alert.status}.`, 400);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    await alert.save();

    if (io) {
      io.emit(WS_EVENTS.ALERT_UPDATE, {
        id: alert._id,
        status: 'acknowledged',
        acknowledgedAt: alert.acknowledgedAt,
      });
    }

    logger.info(`Alert ${alertId} acknowledged by ${userId}`);
    return alert;
  }

  async resolve(alertId, userId, io) {
    const alert = await Alert.findById(alertId);
    if (!alert) throw new AppError('Alert not found.', 404);

    if (alert.status === 'resolved') {
      throw new AppError('Alert is already resolved.', 400);
    }

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    await alert.save();

    if (io) {
      io.emit(WS_EVENTS.ALERT_UPDATE, {
        id: alert._id,
        status: 'resolved',
        resolvedAt: alert.resolvedAt,
      });
    }

    logger.info(`Alert ${alertId} resolved by ${userId}`);
    return alert;
  }

  async getStats() {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalActive,
      bySeverity,
      last24hCount,
      last7dTrend,
      avgResolutionTime,
    ] = await Promise.all([
      Alert.countDocuments({ status: 'active' }),
      Alert.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Alert.countDocuments({ createdAt: { $gte: last24h } }),
      Alert.aggregate([
        { $match: { createdAt: { $gte: last7d } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Alert.aggregate([
        {
          $match: {
            status: 'resolved',
            resolvedAt: { $exists: true },
            createdAt: { $gte: last7d },
          },
        },
        {
          $project: {
            resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] },
          },
        },
        {
          $group: {
            _id: null,
            avgMs: { $avg: '$resolutionMs' },
            minMs: { $min: '$resolutionMs' },
            maxMs: { $max: '$resolutionMs' },
          },
        },
      ]),
    ]);

    return {
      totalActive,
      bySeverity: bySeverity.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      last24hCount,
      last7dTrend,
      avgResolutionTime: avgResolutionTime[0] || null,
    };
  }

  async getNotifications(userId, query) {
    const { limit = 20, read } = query;
    const filter = { recipient: userId };
    if (read !== undefined) filter.read = read === 'true';

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return notifications;
  }

  async markNotificationAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );
    if (!notification) throw new AppError('Notification not found.', 404);
    return notification;
  }

  async markAllNotificationsAsRead(userId) {
    await Notification.updateMany({ recipient: userId, read: false }, { read: true });
  }

  async deleteNotification(notificationId, userId) {
    const result = await Notification.deleteOne({ _id: notificationId, recipient: userId });
    if (result.deletedCount === 0) throw new AppError('Notification not found.', 404);
  }

  async deleteAllNotifications(userId) {
    await Notification.deleteMany({ recipient: userId });
  }

  _scoreSeverity(riskScore) {
    if (riskScore >= RISK_THRESHOLDS.EXTREME) return ALERT_SEVERITY.EMERGENCY;
    if (riskScore >= RISK_THRESHOLDS.VERY_HIGH) return ALERT_SEVERITY.CRITICAL;
    if (riskScore >= RISK_THRESHOLDS.HIGH) return ALERT_SEVERITY.WARNING;
    return ALERT_SEVERITY.INFO;
  }

  async _notifyUsersEmail(alert) {
    try {
      const severityMap = {
        emergency: ['info', 'warning', 'critical', 'emergency'],
        critical: ['info', 'warning', 'critical'],
        warning: ['info', 'warning'],
        info: ['info'],
      };

      const targetSeverities = severityMap[alert.severity] || ['info'];

      const users = await User.find({
        isActive: true,
        isEmailVerified: true,
        'preferences.notifications.email': true,
        'preferences.notifications.alertSeverity': { $in: targetSeverities },
      }).select('email firstName');

      let sentCount = 0;

      for (const user of users) {
        try {
          await EmailService.sendAlertNotification(
            user.email,
            user.firstName,
            alert
          );
          sentCount++;
        } catch (err) {
          logger.error(
            `Failed to send alert email to ${user.email}`,
            err.message
          );
        }
      }

      await Alert.findByIdAndUpdate(alert._id, {
        $inc: { 'notificationsSent.email': sentCount },
      });

      logger.info(
        `Alert ${alert._id}: ${sentCount} email notifications sent`
      );
    } catch (err) {
      logger.error('_notifyUsersEmail failed', err);
    }
  }

  async _createNotificationsForAlert(alert, io) {
    const type = `${alert.severity}_alert`;

    const users = await User.find({
      isActive: true,
      'preferences.notifications.pushAlerts': true,
    }).select('_id');

    const notifications = users.map((user) => ({
      recipient: user._id,
      type,
      title: alert.title,
      message: alert.message,
      region: alert.region?.name,
      alertId: alert._id,
    }));

    if (notifications.length > 0) {
      const created = await Notification.insertMany(notifications, { lean: true });
      
      // Emit to each user via their room
      if (io) {
        created.forEach((notif) => {
          io.to(`user:${notif.recipient}`).emit('NOTIFICATION', {
            type: 'NOTIFICATION',
            notification: notif
          });
        });
      }
    }
  }
}

export default new AlertService();