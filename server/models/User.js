import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'analyst', 'admin', 'super_admin'],
      default: 'user',
    },
    avatar: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    refreshToken: { type: String, select: false },
    lastLogin: { type: Date },
    preferences: {
      map: {
        defaultCenter: {
          lat: { type: Number, default: 36.7783 },
          lng: { type: Number, default: -121.5 },
        },
        defaultZoom: { type: Number, default: 6 },
        showHeatmap: { type: Boolean, default: true },
        showRiskZones: { type: Boolean, default: true },
        showFireSpread: { type: Boolean, default: false },
        show3D: { type: Boolean, default: false },
        autoRefresh: { type: Boolean, default: true },
        refreshInterval: { type: Number, default: 60 },
        clusterMarkers: { type: Boolean, default: true },
        showWeatherOverlay: { type: Boolean, default: false },
      },
      notifications: {
        emailAlerts: { type: Boolean, default: true },
        pushAlerts: { type: Boolean, default: true },
        criticalOnly: { type: Boolean, default: false },
        dailyDigest: { type: Boolean, default: true },
        predictionUpdates: { type: Boolean, default: true },
        systemNotifications: { type: Boolean, default: false },
      },
      appearance: {
        theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
        compactMode: { type: Boolean, default: false },
        animationsEnabled: { type: Boolean, default: true },
        mapStyle: { type: String, enum: ['dark', 'satellite', 'terrain'], default: 'dark' },
      },
    },
    watchRegions: [
      {
        name: String,
        geometry: {
          type: { type: String, enum: ['Polygon', 'Point'], default: 'Point' },
          coordinates: { type: Array },
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for geospatial queries
userSchema.index({ 'watchRegions.geometry': '2dsphere' });
userSchema.index({ email: 1 });

// Hash password pre-save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toProfile = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    isEmailVerified: this.isEmailVerified,
    preferences: this.preferences,
    watchRegions: this.watchRegions,
    createdAt: this.createdAt,
  };
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model('User', userSchema);