import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import logger from '../config/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this._init();
  }

  _init() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      if (process.env.SMTP_USER) {
        this.transporter.verify().then(() => {
          logger.info('✅  Email transporter ready');
        }).catch((err) => {
          logger.warn('Email transporter verification failed', err.message);
        });
      }
    } catch (err) {
      logger.warn('Email transporter init failed', err.message);
    }
  }

  async _send(to, subject, html) {
    if (!this.transporter || !process.env.SMTP_USER) {
      logger.warn(`Email skipped (no SMTP config): to=${to}, subject=${subject}`);
      return;
    }

    const mailOptions = {
      from: `"AstraFlare" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId} to ${to}`);
      return info;
    } catch (err) {
      logger.error(`Email send failed to ${to}:`, err.message);
      throw err;
    }
  }

  _baseTemplate(title, body) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f23; color: #e0e0e0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #FF4500; font-size: 28px; margin: 0; }
        .header p { color: #888; font-size: 12px; }
        .content { background: #1a1a2e; border-radius: 12px; padding: 30px; border: 1px solid #2a2a4a; }
        .content h2 { color: #FF6347; margin-top: 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #FF4500, #FF6347); color: white; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #666; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-critical { background: #dc3545; color: white; }
        .badge-emergency { background: #ff0040; color: white; }
        .badge-warning { background: #ffc107; color: #333; }
        .badge-info { background: #17a2b8; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔥 AstraFlare</h1>
          <p>Wildfire Prediction & Analytics Platform</p>
        </div>
        <div class="content">
          <h2>${title}</h2>
          ${body}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} AstraFlare. All rights reserved.</p>
          <p>You received this email because you have an AstraFlare account.</p>
        </div>
      </div>
    </body>
    </html>`;
  }

  async sendVerificationEmail(email, firstName, token) {
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${token}`;

    const body = `
      <p>Hi ${firstName},</p>
      <p>Welcome to AstraFlare! Please verify your email address to get started.</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" class="btn">Verify Email</a>
      </p>
      <p style="font-size: 12px; color: #888;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="${verifyUrl}" style="color: #FF6347;">${verifyUrl}</a>
      </p>
      <p style="font-size: 12px; color: #888;">This link expires in 24 hours.</p>
    `;

    return this._send(email, 'Verify your AstraFlare account', this._baseTemplate('Verify Your Email', body));
  }

  async sendPasswordResetEmail(email, firstName, token) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;

    const body = `
      <p>Hi ${firstName},</p>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </p>
      <p style="font-size: 12px; color: #888;">
        If you didn't request this, you can safely ignore this email.<br>
        This link expires in 1 hour.
      </p>
    `;

    return this._send(email, 'Reset your AstraFlare password', this._baseTemplate('Password Reset', body));
  }

  async sendAlertNotification(email, firstName, alert) {
    const severityBadge = `<span class="badge badge-${alert.severity}">${alert.severity.toUpperCase()}</span>`;

    const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/alerts`;

    const body = `
      <p>Hi ${firstName},</p>
      <p>A new fire risk alert has been issued:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px 0; color: #888;">Severity:</td>
          <td style="padding: 8px 0;">${severityBadge}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Region:</td>
          <td style="padding: 8px 0;">${alert.region?.name || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Risk Score:</td>
          <td style="padding: 8px 0;">${alert.riskScore ? (alert.riskScore * 100).toFixed(1) + '%' : 'N/A'}</td>
        </tr>
      </table>
      <p><strong>${alert.title}</strong></p>
      <p>${alert.message}</p>
      <p style="text-align: center;">
        <a href="${dashboardUrl}" class="btn">View Alert Dashboard</a>
      </p>
    `;

    return this._send(
      email,
      `🔥 [${alert.severity.toUpperCase()}] ${alert.title}`,
      this._baseTemplate('Fire Risk Alert', body)
    );
  }

  async sendReportReady(email, firstName, report) {
    const reportUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reports/${report._id}`;

    const body = `
      <p>Hi ${firstName},</p>
      <p>Your report is ready for download:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr>
          <td style="padding: 8px 0; color: #888;">Title:</td>
          <td style="padding: 8px 0;">${report.title}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Type:</td>
          <td style="padding: 8px 0;">${report.type}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;">Format:</td>
          <td style="padding: 8px 0;">${report.format.toUpperCase()}</td>
        </tr>
      </table>
      <p style="text-align: center;">
        <a href="${reportUrl}" class="btn">View Report</a>
      </p>
    `;

    return this._send(
      email,
      `Your AstraFlare report is ready: ${report.title}`,
      this._baseTemplate('Report Ready', body)
    );
  }

  async sendWelcomeEmail(email, firstName) {
    const body = `
      <p>Hi ${firstName},</p>
      <p>Welcome to <strong>AstraFlare</strong> — the AI-powered wildfire prediction platform.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li>🗺️ View real-time risk maps</li>
        <li>🔮 Request AI-powered wildfire predictions</li>
        <li>🤖 Chat with PyroSage, our AI assistant</li>
        <li>🚨 Set up custom alert notifications</li>
        <li>📊 Generate detailed risk reports</li>
      </ul>
      <p style="text-align: center;">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="btn">Go to Dashboard</a>
      </p>
    `;

    return this._send(email, 'Welcome to AstraFlare!', this._baseTemplate('Welcome!', body));
  }
}

export default new EmailService();