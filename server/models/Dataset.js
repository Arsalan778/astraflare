import mongoose from 'mongoose';

const datasetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['weather', 'satellite', 'historical_fire', 'terrain', 'custom'],
      required: true,
    },
    source: {
      type: String,
      enum: ['upload', 'modis', 'firms', 'noaa', 'era5', 'custom_api'],
      default: 'upload',
    },
    filePath: String,
    fileSize: Number,        // bytes
    recordCount: Number,
    columns: [String],
    region: {
      name: String,
      bbox: [Number],
    },
    dateRange: {
      start: Date,
      end: Date,
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'error'],
      default: 'uploading',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    usedInTraining: { type: Boolean, default: false },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

datasetSchema.index({ type: 1, status: 1 });

export default mongoose.model('Dataset', datasetSchema);