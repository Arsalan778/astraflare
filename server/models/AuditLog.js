import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: { type: String, required: true, index: true },
    method: { type: String },
    path: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    statusCode: { type: Number },
    requestBody: { type: mongoose.Schema.Types.Mixed },
    responseSuccess: { type: Boolean },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);