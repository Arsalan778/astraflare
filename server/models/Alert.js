import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'emergency'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'expired'],
      default: 'active',
      index: true,
    },
    region: {
      name: String,
      geometry: {
        type: { type: String, enum: ['Point', 'Polygon'], default: 'Point' },
        coordinates: { type: Array, required: true },
      },
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prediction',
    },
    riskScore: Number,
    triggeredBy: {
      type: String,
      enum: ['system', 'manual', 'satellite', 'sensor'],
      default: 'system',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
    notificationsSent: {
      email: { type: Number, default: 0 },
      push: { type: Number, default: 0 },
      sms: { type: Number, default: 0 },
    },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

alertSchema.index({ 'region.geometry': '2dsphere' });
alertSchema.index({ createdAt: -1 });

export default mongoose.model('Alert', alertSchema);