import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['risk_assessment', 'incident', 'monthly_summary', 'custom'],
      default: 'risk_assessment',
    },
    status: {
      type: String,
      enum: ['generating', 'ready', 'error'],
      default: 'generating',
    },
    region: {
      name: String,
      geometry: Object,
    },
    dateRange: {
      start: Date,
      end: Date,
    },
    content: {
      summary: String,
      sections: [
        {
          heading: String,
          body: String,
          chartData: mongoose.Schema.Types.Mixed,
        },
      ],
    },
    predictions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prediction',
      },
    ],
    filePath: String,    // path to generated PDF
    format: {
      type: String,
      enum: ['pdf', 'json', 'csv'],
      default: 'pdf',
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

reportSchema.index({ generatedBy: 1, createdAt: -1 });

export default mongoose.model('Report', reportSchema);