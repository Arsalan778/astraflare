import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { audit } from '../middleware/audit.js';
import { validate } from '../middleware/validator.js';
import { ROLES } from '../config/constants.js';
import {
  updateUserRoleSchema,
  thresholdConfigSchema,
  systemActionSchema,
} from '../validators/adminSchemas.js';
import User from '../models/User.js';
import Prediction from '../models/Prediction.js';
import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';
import Dataset from '../models/Dataset.js';
import { getRedis } from '../config/redis.js';
import logger from '../config/logger.js';
import MLBridgeService from '../services/MLBridgeService.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN));

// ── User Management ─────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password -refreshToken'),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -refreshToken'
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  audit('admin:update_user_role'),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      if (
        role === ROLES.SUPER_ADMIN &&
        req.user.role !== ROLES.SUPER_ADMIN
      ) {
        return res
          .status(403)
          .json({ success: false, message: 'Only super admins can assign super_admin.' });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      ).select('-password -refreshToken');

      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/users/:id/toggle-active',
  audit('admin:toggle_user_active'),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

      if (user._id.toString() === req.user._id.toString()) {
        return res
          .status(400)
          .json({ success: false, message: 'Cannot deactivate yourself.' });
      }

      user.isActive = !user.isActive;
      await user.save();

      res.json({ success: true, data: { id: user._id, isActive: user.isActive } });
    } catch (err) {
      next(err);
    }
  }
);

// ── Audit Logs ──────────────────────────────────────────────────

router.get('/audit-logs', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      startDate,
      endDate,
    } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'firstName lastName email'),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── System Monitor ──────────────────────────────────────────────

router.get('/system/status', async (req, res, next) => {
  try {
    const [
      userCount,
      predictionCount,
      alertCount,
      activeAlerts,
    ] = await Promise.all([
      User.countDocuments(),
      Prediction.countDocuments(),
      Alert.countDocuments(),
      Alert.countDocuments({ status: 'active' }),
    ]);

    // Redis status — gracefully handle offline Redis
    let redisStatus = { status: 'disconnected', memory: 'N/A' };
    try {
      const redis = getRedis();
      const redisInfo = await redis.info('memory');
      const memMatch = redisInfo.match(/used_memory_human:(\S+)/);
      redisStatus = {
        status: 'connected',
        memory: memMatch ? memMatch[1] : 'unknown',
      };
    } catch {
      // Redis is optional in development
    }

    let mlStatus = 'unknown';
    try {
      const mlHealth = await MLBridgeService.healthCheck();
      mlStatus = mlHealth.status || 'healthy';
    } catch {
      mlStatus = 'offline';
    }

    res.json({
      success: true,
      data: {
        server: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          pid: process.pid,
        },
        database: {
          users: userCount,
          predictions: predictionCount,
          alerts: alertCount,
          activeAlerts,
        },
        redis: redisStatus,
        mlService: {
          status: mlStatus,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Model Manager ───────────────────────────────────────────────

router.get('/models', async (req, res, next) => {
  try {
    const models = await MLBridgeService.getModels();
    res.json({ success: true, data: models });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/models/retrain',
  audit('admin:retrain_model'),
  async (req, res, next) => {
    try {
      const result = await MLBridgeService.triggerRetraining(req.body);
      res.status(202).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ── Threshold Configuration ─────────────────────────────────────

const DEFAULT_THRESHOLDS = {
  low: 0.2,
  moderate: 0.4,
  high: 0.6,
  very_high: 0.8,
  extreme: 0.9,
  alertAutoCreate: 0.7,
  emailNotification: 0.8,
};

router.get('/thresholds', async (req, res, next) => {
  try {
    let thresholds = DEFAULT_THRESHOLDS;
    try {
      const redis = getRedis();
      const raw = await redis.get('config:thresholds');
      if (raw) thresholds = JSON.parse(raw);
    } catch {
      // Redis unavailable — return defaults
    }
    res.json({ success: true, data: thresholds });
  } catch (err) {
    next(err);
  }
});

router.put(
  '/thresholds',
  validate(thresholdConfigSchema),
  audit('admin:update_thresholds'),
  async (req, res, next) => {
    try {
      try {
        const redis = getRedis();
        await redis.set('config:thresholds', JSON.stringify(req.body));
      } catch {
        logger.warn('Redis unavailable — threshold update not persisted to cache');
      }
      res.json({ success: true, data: req.body, message: 'Thresholds updated.' });
    } catch (err) {
      next(err);
    }
  }
);

// ── Datasets ────────────────────────────────────────────────────

router.get('/datasets', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [datasets, total] = await Promise.all([
      Dataset.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'firstName lastName'),
      Dataset.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: datasets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/datasets/:id',
  audit('admin:delete_dataset'),
  async (req, res, next) => {
    try {
      const dataset = await Dataset.findByIdAndDelete(req.params.id);
      if (!dataset) {
        return res.status(404).json({ success: false, message: 'Dataset not found.' });
      }
      res.json({ success: true, message: 'Dataset deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

// ── Dashboard Stats ─────────────────────────────────────────────

router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      totalPredictions,
      predictions24h,
      activeAlerts,
      criticalAlerts,
      riskDistribution,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: last24h } }),
      Prediction.countDocuments(),
      Prediction.countDocuments({ createdAt: { $gte: last24h } }),
      Alert.countDocuments({ status: 'active' }),
      Alert.countDocuments({ status: 'active', severity: { $in: ['critical', 'emergency'] } }),
      Prediction.aggregate([
        { $match: { createdAt: { $gte: last7d }, status: 'completed' } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        totalPredictions,
        predictions24h,
        activeAlerts,
        criticalAlerts,
        riskDistribution: riskDistribution.reduce((acc, r) => {
          acc[r._id] = r.count;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;