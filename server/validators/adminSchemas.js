import Joi from 'joi';

export const updateUserRoleSchema = Joi.object({
  role: Joi.string()
    .valid('user', 'analyst', 'admin', 'super_admin')
    .required()
    .messages({
      'any.only': 'Role must be one of: user, analyst, admin, super_admin.',
      'any.required': 'Role is required.',
    }),
});

export const thresholdConfigSchema = Joi.object({
  low: Joi.number().min(0).max(1).required().messages({
    'number.base': 'Low threshold must be a number between 0 and 1.',
  }),
  moderate: Joi.number()
    .min(0)
    .max(1)
    .greater(Joi.ref('low'))
    .required()
    .messages({
      'number.greater': 'Moderate threshold must be greater than low.',
    }),
  high: Joi.number()
    .min(0)
    .max(1)
    .greater(Joi.ref('moderate'))
    .required()
    .messages({
      'number.greater': 'High threshold must be greater than moderate.',
    }),
  very_high: Joi.number()
    .min(0)
    .max(1)
    .greater(Joi.ref('high'))
    .required()
    .messages({
      'number.greater': 'Very high threshold must be greater than high.',
    }),
  extreme: Joi.number()
    .min(0)
    .max(1)
    .greater(Joi.ref('very_high'))
    .required()
    .messages({
      'number.greater': 'Extreme threshold must be greater than very high.',
    }),
  alertAutoCreate: Joi.number().min(0).max(1).required().messages({
    'number.base': 'Alert auto-create threshold must be between 0 and 1.',
  }),
  emailNotification: Joi.number().min(0).max(1).required().messages({
    'number.base': 'Email notification threshold must be between 0 and 1.',
  }),
});

export const systemActionSchema = Joi.object({
  action: Joi.string()
    .valid(
      'clear_cache',
      'restart_workers',
      'pause_predictions',
      'resume_predictions',
      'run_diagnostics'
    )
    .required(),
  target: Joi.string().allow('', null),
  params: Joi.object().pattern(Joi.string(), Joi.any()),
});

export const datasetQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid(
    'weather',
    'satellite',
    'historical_fire',
    'terrain',
    'custom'
  ),
  status: Joi.string().valid('uploading', 'processing', 'ready', 'error'),
  search: Joi.string().trim().max(200),
  sortBy: Joi.string()
    .valid('createdAt', 'name', 'fileSize', 'recordCount')
    .default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const modelRetrainSchema = Joi.object({
  model: Joi.string()
    .valid(
      'gradient_boosting',
      'conv_lstm',
      'transformer',
      'bayesian',
      'ensemble',
      'automl'
    )
    .required(),
  datasetId: Joi.string().hex().length(24).allow(null),
  hyperparams: Joi.object().pattern(Joi.string(), Joi.any()),
});

export const auditLogQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  userId: Joi.string().hex().length(24),
  action: Joi.string().trim().max(100),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
});

export const bulkUserActionSchema = Joi.object({
  userIds: Joi.array()
    .items(Joi.string().hex().length(24))
    .min(1)
    .max(50)
    .required(),
  action: Joi.string()
    .valid('activate', 'deactivate', 'change_role', 'delete')
    .required(),
  role: Joi.string()
    .valid('user', 'analyst', 'admin')
    .when('action', {
      is: 'change_role',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
});