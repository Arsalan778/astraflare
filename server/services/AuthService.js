import crypto from 'crypto';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenHelper.js';
import EmailService from './EmailService.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

class AuthService {
  async register({ firstName, lastName, email, password }) {
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('Email is already registered.', 409);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      emailVerificationToken: crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex'),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Send verification email (fire and forget)
    EmailService.sendVerificationEmail(user.email, user.firstName, verificationToken).catch(
      (err) => logger.error('Verification email failed', err)
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toProfile(),
      accessToken,
      refreshToken,
    };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toProfile(),
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token) {
    if (!token) {
      throw new AppError('Refresh token required.', 401);
    }

    const decoded = verifyRefreshToken(token);

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid refresh token.', 401);
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }

  async verifyEmail(token) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw new AppError('Invalid or expired verification token.', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return user.toProfile();
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) return; // Silently succeed for security

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hr
    await user.save({ validateBeforeSave: false });

    EmailService.sendPasswordResetEmail(user.email, user.firstName, resetToken).catch(
      (err) => logger.error('Password reset email failed', err)
    );
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError('Invalid or expired reset token.', 400);
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = undefined; // Invalidate sessions
    await user.save();

    return user.toProfile();
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    user.password = newPassword;
    await user.save();
  }

  async updateProfile(userId, updates) {
    const allowedFields = [
      'firstName',
      'lastName',
      'avatar',
      'preferences',
      'watchRegions',
    ];

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        if (key === 'preferences' && typeof updates[key] === 'object') {
          // Deep merge preferences
          for (const prefKey in updates.preferences) {
            if (typeof updates.preferences[prefKey] === 'object' && !Array.isArray(updates.preferences[prefKey])) {
              user.preferences[prefKey] = {
                ...user.preferences[prefKey],
                ...updates.preferences[prefKey]
              };
            } else {
              user.preferences[prefKey] = updates.preferences[prefKey];
            }
          }
          user.markModified('preferences');
        } else {
          user[key] = updates[key];
        }
      }
    }

    await user.save();
    return user.toProfile();
  }
}

export default new AuthService();