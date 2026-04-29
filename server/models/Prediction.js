import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    region: {
      name: { type: String, required: true },
      geometry: {
        type: {
          type: String,
          enum: ['Point', 'Polygon'],
          default: 'Point',
        },
        coordinates: { type: Array, required: true },
      },
      bbox: [Number], // [minLng, minLat, maxLng, maxLat]
    },
    model: {
      type: String,
      enum: [
        'gradient_boosting',
        'conv_lstm',
        'transformer',
        'bayesian',
        'ensemble',
        'automl',
      ],
      default: 'ensemble',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    riskScore: { type: Number, min: 0, max: 1 },
    riskLevel: {
      type: String,
      enum: ['none', 'low', 'moderate', 'high', 'very_high', 'extreme'],
    },
    confidence: { type: Number, min: 0, max: 1 },
    features: {
      temperature: Number,
      humidity: Number,
      windSpeed: Number,
      windDirection: Number,
      precipitation: Number,
      vegetationIndex: Number, // NDVI
      soilMoisture: Number,
      elevation: Number,
      slope: Number,
      fuelMoisture: Number,
      droughtIndex: Number,
    },
    featureImportance: [
      {
        name: String,
        importance: Number,
      },
    ],
    explanation: {
      shap: { type: Map, of: Number },
      lime: { type: Map, of: Number },
      narrative: { type: String },
    },
    fireSpread: {
      simulationId: String,
      timesteps: [
        {
          hour: Number,
          affectedArea: Number, // km²
          perimeterKm: Number,
          geometry: Object,
        },
      ],
    },
    emissions: {
      co2Tonnes: Number,
      pm25: Number,
      pm10: Number,
      blackCarbon: Number,
    },
    weather: {
      current: Object,
      forecast: [Object],
    },
    satellite: {
      source: String,
      capturedAt: Date,
      hotspots: Number,
      frp: Number, // Fire Radiative Power
    },
    timeframe: {
      predictionDate: { type: Date, default: Date.now },
      horizonHours: { type: Number, default: 72 },
    },
    error: { type: String },
    processingTime: { type: Number }, // ms
    fireProbability: { type: Number, min: 0, max: 1 },
    spreadRate: { type: Number },
    timestamp: { type: Date, default: Date.now },
    modelUsed: { type: String },
    topFactors: [
      {
        name: String,
        importance: Number,
      },
    ],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

predictionSchema.index({ 'region.geometry': '2dsphere' });
predictionSchema.index({ status: 1, createdAt: -1 });
predictionSchema.index({ riskLevel: 1 });

export default mongoose.model('Prediction', predictionSchema);