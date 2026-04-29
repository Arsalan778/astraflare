export const ROLES = {
  USER: 'user',
  ANALYST: 'analyst',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const RISK_LEVELS = {
  NONE: 'none',
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
  EXTREME: 'extreme',
};

export const RISK_THRESHOLDS = {
  LOW: 0.2,
  MODERATE: 0.4,
  HIGH: 0.6,
  VERY_HIGH: 0.8,
  EXTREME: 0.9,
};

export const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency',
};

export const ALERT_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  EXPIRED: 'expired',
};

export const PREDICTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const MODEL_TYPES = {
  GRADIENT_BOOSTING: 'gradient_boosting',
  CONV_LSTM: 'conv_lstm',
  TRANSFORMER: 'transformer',
  BAYESIAN: 'bayesian',
  ENSEMBLE: 'ensemble',
  AUTOML: 'automl',
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const CACHE_TTL = {
  SHORT: 60,           // 1 min
  MEDIUM: 300,         // 5 min
  LONG: 3600,          // 1 hr
  PREDICTION: 1800,    // 30 min
  MAP_DATA: 600,       // 10 min
  SATELLITE: 900,      // 15 min
};

export const QUEUE_NAMES = {
  PREDICTION: 'prediction-queue',
  ALERT: 'alert-queue',
  REPORT: 'report-queue',
  TRAINING: 'training-queue',
};

export const WS_EVENTS = {
  PREDICTION_UPDATE: 'prediction:update',
  PREDICTION_COMPLETE: 'prediction:complete',
  ALERT_NEW: 'alert:new',
  ALERT_UPDATE: 'alert:update',
  MAP_UPDATE: 'map:update',
  FIRE_SPREAD: 'fire:spread',
  SYSTEM_STATUS: 'system:status',
};