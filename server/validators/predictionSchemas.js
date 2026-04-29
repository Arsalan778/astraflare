import Joi from 'joi';

export const createPredictionSchema = Joi.object({
  region: Joi.object({
    name: Joi.string().trim().min(1).max(200).required().messages({
      'string.empty': 'Region name is required.',
    }),
    geometry: Joi.object({
      type: Joi.string().valid('Point', 'Polygon').required(),
      coordinates: Joi.alternatives()
        .try(
          // Point: [lng, lat]
          Joi.array().ordered(
            Joi.number().min(-180).max(180),
            Joi.number().min(-90).max(90)
          ),
          // Polygon: [[[lng, lat], ...]]
          Joi.array().items(
            Joi.array().items(
              Joi.array().ordered(
                Joi.number().min(-180).max(180),
                Joi.number().min(-90).max(90)
              )
            )
          )
        )
        .required(),
    }).required(),
    bbox: Joi.array().length(4).items(Joi.number()),
  }).required(),

  model: Joi.string()
    .valid(
      'gradient_boosting',
      'conv_lstm',
      'transformer',
      'bayesian',
      'ensemble',
      'automl'
    )
    .default('ensemble'),

  predictionDate: Joi.date().iso().default(null),

  horizonHours: Joi.number().integer().min(1).max(168).default(72).messages({
    'number.min': 'Horizon must be at least 1 hour.',
    'number.max': 'Horizon must be at most 168 hours (7 days).',
  }),

  features: Joi.object({
    temperature: Joi.number().min(-60).max(60),
    humidity: Joi.number().min(0).max(100),
    windSpeed: Joi.number().min(0).max(300),
    windDirection: Joi.number().min(0).max(360),
    precipitation: Joi.number().min(0),
    vegetationIndex: Joi.number().min(-1).max(1),
    soilMoisture: Joi.number().min(0).max(1),
    elevation: Joi.number().min(-500).max(9000),
    slope: Joi.number().min(0).max(90),
    fuelMoisture: Joi.number().min(0).max(1),
    droughtIndex: Joi.number().min(0).max(1),
  }),

  metadata: Joi.object().pattern(Joi.string(), Joi.any()),
});

export const queryPredictionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed'),
  riskLevel: Joi.string().valid(
    'none',
    'low',
    'moderate',
    'high',
    'very_high',
    'extreme'
  ),
  model: Joi.string().valid(
    'gradient_boosting',
    'conv_lstm',
    'transformer',
    'bayesian',
    'ensemble',
    'automl'
  ),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).messages({
    'date.greater': 'End date must be after start date.',
  }),
  sortBy: Joi.string()
    .valid('createdAt', 'riskScore', 'confidence', 'processingTime')
    .default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  region: Joi.string().trim(),
  bbox: Joi.string().pattern(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/),
});

export const fireSpreadSimulationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  windSpeed: Joi.number().min(0).max(200).default(15),
  windDirection: Joi.number().min(0).max(360).default(180),
  humidity: Joi.number().min(0).max(100).default(30),
  temperature: Joi.number().min(-40).max(60).default(35),
  vegetationType: Joi.string()
    .valid('grassland', 'shrubland', 'forest', 'mixed', 'urban_interface')
    .default('mixed'),
  durationHours: Joi.number().integer().min(1).max(120).default(48),
  resolution: Joi.string().valid('low', 'medium', 'high').default('medium'),
});