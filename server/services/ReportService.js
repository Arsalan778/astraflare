import path from 'path';
import fs from 'fs/promises';
import PDFDocument from 'pdfkit';
import Report from '../models/Report.js';
import Prediction from '../models/Prediction.js';
import Alert from '../models/Alert.js';
import { AppError } from '../middleware/errorHandler.js';
import { PAGINATION } from '../config/constants.js';
import logger from '../config/logger.js';

const REPORTS_DIR = process.env.REPORTS_DIR || 'reports/';

class ReportService {
  constructor() {
    // Ensure reports directory exists
    fs.mkdir(REPORTS_DIR, { recursive: true }).catch(() => {});
  }

  async generate(data, userId) {
    const report = await Report.create({
      title: data.title || `Report - ${new Date().toISOString().split('T')[0]}`,
      type: data.type || 'risk_assessment',
      region: data.region,
      dateRange: data.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      format: data.format || 'pdf',
      generatedBy: userId,
      status: 'generating',
    });

    // Process asynchronously
    this._generateAsync(report).catch((err) =>
      logger.error('Report generation failed', err)
    );

    return report;
  }

  async _generateAsync(report) {
    try {
      const dateFilter = {
        createdAt: {
          $gte: report.dateRange.start,
          $lte: report.dateRange.end,
        },
        status: 'completed',
      };

      if (report.region?.name) {
        dateFilter['region.name'] = {
          $regex: report.region.name,
          $options: 'i',
        };
      }

      const [predictions, alerts] = await Promise.all([
        Prediction.find(dateFilter)
          .sort({ createdAt: -1 })
          .limit(200)
          .lean(),
        Alert.find({
          createdAt: {
            $gte: report.dateRange.start,
            $lte: report.dateRange.end,
          },
          ...(report.region?.name
            ? { 'region.name': { $regex: report.region.name, $options: 'i' } }
            : {}),
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      // Build report content
      const content = this._buildContent(report, predictions, alerts);
      report.content = content;
      report.predictions = predictions.map((p) => p._id);

      // Generate file
      if (report.format === 'pdf') {
        const filePath = await this._generatePDF(report, predictions, alerts);
        report.filePath = filePath;
      } else if (report.format === 'json') {
        const filePath = path.join(REPORTS_DIR, `${report._id}.json`);
        await fs.writeFile(filePath, JSON.stringify(content, null, 2));
        report.filePath = filePath;
      } else if (report.format === 'csv') {
        const filePath = await this._generateCSV(report, predictions);
        report.filePath = filePath;
      }

      report.status = 'ready';
      await report.save();

      logger.info(`Report ${report._id} generated successfully`);
    } catch (err) {
      report.status = 'error';
      report.metadata = report.metadata || new Map();
      report.metadata.set('error', err.message);
      await report.save();
      throw err;
    }
  }

  _buildContent(report, predictions, alerts) {
    const totalPredictions = predictions.length;
    const avgRisk =
      totalPredictions > 0
        ? predictions.reduce((s, p) => s + (p.riskScore || 0), 0) /
          totalPredictions
        : 0;

    const riskDist = {};
    predictions.forEach((p) => {
      const level = p.riskLevel || 'unknown';
      riskDist[level] = (riskDist[level] || 0) + 1;
    });

    const highRiskRegions = {};
    predictions
      .filter((p) => p.riskScore >= 0.6)
      .forEach((p) => {
        const name = p.region?.name || 'Unknown';
        if (!highRiskRegions[name]) {
          highRiskRegions[name] = { maxRisk: 0, count: 0 };
        }
        highRiskRegions[name].maxRisk = Math.max(
          highRiskRegions[name].maxRisk,
          p.riskScore
        );
        highRiskRegions[name].count++;
      });

    const sections = [
      {
        heading: 'Executive Summary',
        body: `This report covers the period from ${report.dateRange.start.toISOString().split('T')[0]} to ${report.dateRange.end.toISOString().split('T')[0]}. A total of ${totalPredictions} predictions were analyzed with an average risk score of ${(avgRisk * 100).toFixed(1)}%. There were ${alerts.length} alerts generated during this period.`,
        chartData: null,
      },
      {
        heading: 'Risk Distribution',
        body: `Predictions by risk level: ${Object.entries(riskDist).map(([k, v]) => `${k}: ${v}`).join(', ')}.`,
        chartData: { type: 'pie', data: riskDist },
      },
      {
        heading: 'High Risk Regions',
        body:
          Object.keys(highRiskRegions).length > 0
            ? Object.entries(highRiskRegions)
                .sort((a, b) => b[1].maxRisk - a[1].maxRisk)
                .map(
                  ([name, info]) =>
                    `${name}: max risk ${(info.maxRisk * 100).toFixed(1)}%, ${info.count} high-risk prediction(s)`
                )
                .join('\n')
            : 'No high-risk regions detected during this period.',
        chartData: { type: 'bar', data: highRiskRegions },
      },
      {
        heading: 'Alert Summary',
        body: `Total alerts: ${alerts.length}. Critical/Emergency: ${alerts.filter((a) => ['critical', 'emergency'].includes(a.severity)).length}. Resolved: ${alerts.filter((a) => a.status === 'resolved').length}.`,
        chartData: null,
      },
    ];

    return {
      summary: sections[0].body,
      sections,
    };
  }

  async _generatePDF(report, predictions, alerts) {
    const filePath = path.join(REPORTS_DIR, `${report._id}.pdf`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = require('fs').createWriteStream(filePath);

      doc.pipe(stream);

      // Title
      doc
        .fontSize(24)
        .fillColor('#FF4500')
        .text('AstraFlare', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(18)
        .fillColor('#333')
        .text(report.title, { align: 'center' })
        .moveDown(0.3);

      doc
        .fontSize(10)
        .fillColor('#666')
        .text(`Generated: ${new Date().toISOString()}`, { align: 'center' })
        .text(`Type: ${report.type}`, { align: 'center' })
        .moveDown(1);

      // Sections
      if (report.content?.sections) {
        for (const section of report.content.sections) {
          doc
            .fontSize(14)
            .fillColor('#FF4500')
            .text(section.heading)
            .moveDown(0.3);

          doc
            .fontSize(10)
            .fillColor('#333')
            .text(section.body)
            .moveDown(1);
        }
      }

      // Stats
      doc
        .fontSize(14)
        .fillColor('#FF4500')
        .text('Statistics')
        .moveDown(0.3);

      doc
        .fontSize(10)
        .fillColor('#333')
        .text(`Total Predictions Analyzed: ${predictions.length}`)
        .text(`Total Alerts: ${alerts.length}`)
        .text(`Report Period: ${report.dateRange.start.toISOString().split('T')[0]} to ${report.dateRange.end.toISOString().split('T')[0]}`)
        .moveDown(1);

      // Footer
      doc
        .fontSize(8)
        .fillColor('#999')
        .text('This report was automatically generated by the AstraFlare platform.', {
          align: 'center',
        });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  async _generateCSV(report, predictions) {
    const filePath = path.join(REPORTS_DIR, `${report._id}.csv`);

    const headers = [
      'Date',
      'Region',
      'Model',
      'Risk Score',
      'Risk Level',
      'Confidence',
      'Temperature',
      'Humidity',
      'Wind Speed',
    ];

    const rows = predictions.map((p) => [
      p.createdAt?.toISOString() || '',
      p.region?.name || '',
      p.model || '',
      p.riskScore?.toFixed(4) || '',
      p.riskLevel || '',
      p.confidence?.toFixed(4) || '',
      p.features?.temperature || '',
      p.features?.humidity || '',
      p.features?.windSpeed || '',
    ]);

    const csv =
      headers.join(',') + '\n' + rows.map((r) => r.join(',')).join('\n');

    await fs.writeFile(filePath, csv);
    return filePath;
  }

  async list(query, user) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      type,
      status,
    } = query;

    const filter = {};
    if (user.role === 'user') filter.generatedBy = user._id;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const effectiveLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

    const [data, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(effectiveLimit)
        .populate('generatedBy', 'firstName lastName email'),
      Report.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: effectiveLimit,
        total,
        pages: Math.ceil(total / effectiveLimit),
      },
    };
  }

  async getById(id) {
    const report = await Report.findById(id)
      .populate('generatedBy', 'firstName lastName email')
      .populate('predictions');

    if (!report) throw new AppError('Report not found.', 404);
    return report;
  }

  async getDownload(id) {
    const report = await Report.findById(id);
    if (!report) throw new AppError('Report not found.', 404);
    if (report.status !== 'ready' || !report.filePath) {
      throw new AppError('Report is not ready for download.', 400);
    }

    // Verify file exists
    try {
      await fs.access(report.filePath);
    } catch {
      throw new AppError('Report file not found on disk.', 404);
    }

    const mimeTypes = {
      pdf: 'application/pdf',
      json: 'application/json',
      csv: 'text/csv',
    };

    return {
      filePath: path.resolve(report.filePath),
      fileName: `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.${report.format}`,
      mimeType: mimeTypes[report.format] || 'application/octet-stream',
    };
  }

  async remove(id) {
    const report = await Report.findById(id);
    if (!report) throw new AppError('Report not found.', 404);

    // Remove file from disk
    if (report.filePath) {
      try {
        await fs.unlink(report.filePath);
      } catch (err) {
        logger.warn(`Could not delete report file: ${report.filePath}`, err.message);
      }
    }

    await Report.findByIdAndDelete(id);
  }

  async getStats(user) {
    const filter = {};
    if (user.role === 'user') filter.generatedBy = user._id;

    const [total, byType, byStatus] = await Promise.all([
      Report.countDocuments(filter),
      Report.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Report.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byType: byType.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc, r) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
    };
  }
}

export default new ReportService();