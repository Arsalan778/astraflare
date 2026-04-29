import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { audit } from '../middleware/audit.js';
import { ROLES } from '../config/constants.js';
import Dataset from '../models/Dataset.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = Router();

// ── Multer setup ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.csv', '.json', '.geojson', '.tif', '.nc', '.hdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${ext} not allowed`, 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// ── Upload dataset ──────────────────────────────────────────────

router.post(
  '/upload',
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  upload.single('file'),
  audit('data:upload'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const dataset = await Dataset.create({
        name: req.body.name || req.file.originalname,
        description: req.body.description,
        type: req.body.type || 'custom',
        source: 'upload',
        filePath: req.file.path,
        fileSize: req.file.size,
        columns: req.body.columns ? JSON.parse(req.body.columns) : [],
        region: req.body.region ? JSON.parse(req.body.region) : undefined,
        dateRange: req.body.dateRange ? JSON.parse(req.body.dateRange) : undefined,
        status: 'processing',
        uploadedBy: req.user._id,
      });

      // In production, enqueue background processing job
      // For now, set to ready
      dataset.status = 'ready';
      await dataset.save();

      logger.info(`Dataset uploaded: ${dataset._id} by ${req.user.email}`);

      res.status(201).json({ success: true, data: dataset });
    } catch (err) {
      next(err);
    }
  }
);

// ── List datasets ───────────────────────────────────────────────

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status, search } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [datasets, total] = await Promise.all([
      Dataset.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'firstName lastName email'),
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

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const dataset = await Dataset.findById(req.params.id).populate(
      'uploadedBy',
      'firstName lastName email'
    );
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found.' });
    }
    res.json({ success: true, data: dataset });
  } catch (err) {
    next(err);
  }
});

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('data:delete'),
  async (req, res, next) => {
    try {
      const dataset = await Dataset.findByIdAndDelete(req.params.id);
      if (!dataset) {
        return res.status(404).json({ success: false, message: 'Dataset not found.' });
      }
      // Optionally remove file from disk here
      res.json({ success: true, message: 'Dataset deleted.' });
    } catch (err) {
      next(err);
    }
  }
);

// ── External data ingestion endpoints ───────────────────────────

router.post(
  '/ingest/weather',
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('data:ingest_weather'),
  async (req, res, next) => {
    try {
      const { region, dateRange } = req.body;
      // Proxy to ML service
      const axios = (await import('axios')).default;
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const response = await axios.post(`${mlUrl}/data/weather`, { region, dateRange });

      res.json({ success: true, data: response.data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/ingest/satellite',
  authenticate,
  authorize(ROLES.ANALYST, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  audit('data:ingest_satellite'),
  async (req, res, next) => {
    try {
      const { region, source, dateRange } = req.body;
      const axios = (await import('axios')).default;
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const response = await axios.post(`${mlUrl}/data/satellite`, {
        region,
        source,
        dateRange,
      });

      res.json({ success: true, data: response.data });
    } catch (err) {
      next(err);
    }
  }
);

export default router;