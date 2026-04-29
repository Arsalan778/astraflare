import Joi from 'joi';

export const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'First name is required.',
    'string.max': 'First name must be at most 50 characters.',
  }),
  lastName: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'Last name is required.',
    'string.max': 'Last name must be at most 50 characters.',
  }),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address.',
    'string.empty': 'Email is required.',
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters.',
      'string.max': 'Password must be at most 128 characters.',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
      'string.empty': 'Password is required.',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address.',
    'string.empty': 'Email is required.',
  }),
  password: Joi.string().min(1).required().messages({
    'string.empty': 'Password is required.',
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address.',
    'string.empty': 'Email is required.',
  }),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters.',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match.',
    }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).required().messages({
    'string.empty': 'Current password is required.',
  }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters.',
      'string.pattern.base':
        'New password must contain at least one uppercase letter, one lowercase letter, and one number.',
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match.',
    }),
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50),
  lastName: Joi.string().trim().min(1).max(50),
  avatar: Joi.string().uri().allow(null, ''),
  preferences: Joi.object({
    defaultRegion: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
    }),
    units: Joi.string().valid('metric', 'imperial'),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      alertSeverity: Joi.string().valid('info', 'warning', 'critical', 'emergency'),
    }),
    theme: Joi.string().valid('dark', 'light'),
  }),
  watchRegions: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      geometry: Joi.object({
        type: Joi.string().valid('Polygon', 'Point').required(),
        coordinates: Joi.array().required(),
      }).required(),
    })
  ),
}).min(1);