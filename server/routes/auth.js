import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validator.js';
import { audit } from '../middleware/audit.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/authSchemas.js';
import AuthService from '../services/AuthService.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  audit('user:register'),
  async (req, res, next) => {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  audit('user:login'),
  async (req, res, next) => {
    try {
      const result = await AuthService.login(req.body);

      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
      });

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/refresh-token', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    const result = await AuthService.refreshToken(token);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken } });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, audit('user:logout'), async (req, res, next) => {
  try {
    await AuthService.logout(req.user._id);
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ success: true, data: req.user.toProfile() });
});

router.put(
  '/me',
  authenticate,
  audit('user:update_profile'),
  async (req, res, next) => {
    try {
      const updated = await AuthService.updateProfile(req.user._id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/verify-email/:token',
  audit('user:verify_email'),
  async (req, res, next) => {
    try {
      await AuthService.verifyEmail(req.params.token);
      res.json({ success: true, message: 'Email verified.' });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  audit('user:forgot_password'),
  async (req, res, next) => {
    try {
      await AuthService.forgotPassword(req.body.email);
      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/reset-password/:token',
  authLimiter,
  validate(resetPasswordSchema),
  audit('user:reset_password'),
  async (req, res, next) => {
    try {
      await AuthService.resetPassword(req.params.token, req.body.password);
      res.json({ success: true, message: 'Password reset successful.' });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  audit('user:change_password'),
  async (req, res, next) => {
    try {
      await AuthService.changePassword(
        req.user._id,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json({ success: true, message: 'Password changed.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;