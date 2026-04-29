import Conversation from '../models/Conversation.js';
import Prediction from '../models/Prediction.js';
import Alert from '../models/Alert.js';
import MLBridgeService from './MLBridgeService.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

class PyroSageService {
  async chat(userId, message, conversationId, context) {
    let conversation;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });
      if (!conversation) {
        throw new AppError('Conversation not found.', 404);
      }
    } else {
      conversation = await Conversation.create({
        userId,
        title: message.substring(0, 80),
        messages: [],
        context: context || {},
      });
    }

    // Append user message
    conversation.messages.push({
      role: 'user',
      content: message,
    });

    // Build context for ML service
    const enrichedContext = await this._buildContext(userId, context);

    // Get last N messages for conversation history
    const recentMessages = conversation.messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call ML service
    const response = await MLBridgeService.chat(message, {
      history: recentMessages,
      ...enrichedContext,
    });

    // Append assistant message
    conversation.messages.push({
      role: 'assistant',
      content: response.response || response.message,
      metadata: {
        sources: response.sources || [],
        charts: response.charts || [],
        confidence: response.confidence,
      },
    });

    // Update conversation title if it's the first exchange
    if (conversation.messages.length <= 2) {
      conversation.title =
        response.suggested_title || message.substring(0, 80);
    }

    await conversation.save();

    return {
      conversationId: conversation._id,
      message: {
        role: 'assistant',
        content: response.response || response.message,
        metadata: {
          sources: response.sources || [],
          charts: response.charts || [],
          confidence: response.confidence,
        },
      },
    };
  }

  async _buildContext(userId, extraContext) {
    try {
      const [recentPredictions, activeAlerts] = await Promise.all([
        Prediction.find({ userId, status: 'completed' })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('region.name riskScore riskLevel createdAt')
          .lean(),
        Alert.find({ status: 'active' })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title severity region.name')
          .lean(),
      ]);

      return {
        recentPredictions: recentPredictions.map((p) => ({
          region: p.region?.name,
          risk: p.riskScore,
          level: p.riskLevel,
          date: p.createdAt,
        })),
        activeAlerts: activeAlerts.map((a) => ({
          title: a.title,
          severity: a.severity,
          region: a.region?.name,
        })),
        ...(extraContext || {}),
      };
    } catch (err) {
      logger.error('Failed to build PyroSage context', err);
      return extraContext || {};
    }
  }

  async getConversations(userId) {
    const conversations = await Conversation.find({ userId, isActive: true })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt messages')
      .lean();

    return conversations.map((c) => ({
      id: c._id,
      title: c.title,
      messageCount: c.messages.length,
      lastMessage: c.messages.length
        ? c.messages[c.messages.length - 1].content.substring(0, 100)
        : '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async getConversation(conversationId, userId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId,
    });
    if (!conversation) {
      throw new AppError('Conversation not found.', 404);
    }
    return conversation;
  }

  async deleteConversation(conversationId, userId) {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId },
      { isActive: false },
      { new: true }
    );
    if (!conversation) {
      throw new AppError('Conversation not found.', 404);
    }
  }

  async getSuggestions(userId, region) {
    const baseSuggestions = [
      'What is the current fire risk in this area?',
      'Show me the historical fire trends for this region.',
      'What weather conditions contribute most to fire risk?',
      'Explain the key factors driving the current risk score.',
      'What evacuation routes are available nearby?',
      'How does vegetation index affect fire probability?',
      'Compare fire risk between Northern and Southern California.',
      'What are the predicted emissions if a fire occurs here?',
    ];

    // Add contextual suggestions
    const contextual = [];

    try {
      const activeAlerts = await Alert.countDocuments({ status: 'active' });
      if (activeAlerts > 0) {
        contextual.push(
          `There are ${activeAlerts} active alerts. Tell me about the most critical ones.`
        );
      }

      const recentPrediction = await Prediction.findOne({
        userId,
        status: 'completed',
      })
        .sort({ createdAt: -1 })
        .select('region.name riskLevel');

      if (recentPrediction) {
        contextual.push(
          `My last prediction for ${recentPrediction.region.name} was ${recentPrediction.riskLevel}. What can I do to monitor it?`
        );
      }

      if (region) {
        contextual.push(`What is the detailed risk breakdown for ${region}?`);
      }
    } catch (err) {
      logger.error('Failed to build contextual suggestions', err);
    }

    return [...contextual, ...baseSuggestions].slice(0, 8);
  }

  async getInsights(userId, query = {}) {
    try {
      const context = await this._buildContext(userId);
      
      // If we have no data, return a welcoming default
      if (context.recentPredictions.length === 0 && context.activeAlerts.length === 0) {
        return [
          {
            id: 'welcome',
            type: 'info',
            title: 'Welcome to AstraFlare!',
            content: 'Run your first wildfire risk prediction to see personalized AI insights here.',
            icon: 'sparkles',
          }
        ];
      }

      // Ask Gemini for a summary insight
      const prompt = `Based on these recent predictions: ${JSON.stringify(context.recentPredictions || [])} 
      and these active alerts: ${JSON.stringify(context.activeAlerts || [])}, 
      provide 3-4 concise, high-value wildfire safety insights or recommendations. 
      Format as a JSON array of objects with id, type (danger, warning, info, success), title, subtitle, description, and icon.`;

      const response = await MLBridgeService.chat(prompt, { 
        system_instruction: "You are PyroSage, a specialized wildfire safety analyst. Keep insights concise and actionable."
      });

      // Extract raw content
      const rawContent = response?.response || response?.message || (typeof response === 'string' ? response : '');
      if (!rawContent) {
        throw new Error('Empty response from AI');
      }

      // Cleanup and Parse
      const cleaned = rawContent.replace(/```json|```/g, '').trim();
      
      try {
        const parsed = JSON.parse(cleaned);
        const insights = Array.isArray(parsed) ? parsed : [parsed];
        
        return insights.map((item, idx) => ({
          id: item.id || `insight-${idx}-${Date.now()}`,
          type: item.type || 'info',
          title: item.title || 'Regional Insight',
          subtitle: item.subtitle || item.type || 'PyroSage Analysis',
          description: item.description || item.content || item.text || cleaned.slice(0, 200),
          icon: item.icon || 'activity'
        }));
      } catch (parseErr) {
        // Fallback to plain text if JSON parsing fails
        return [{
          id: `summary-${Date.now()}`,
          type: 'info',
          title: 'Regional Activity Summary',
          subtitle: 'PyroSage Analysis',
          description: cleaned,
          icon: 'activity'
        }];
      }
    } catch (err) {
      logger.error('Failed to get PyroSage insights', err);
      return [{
        id: 'error-fallback',
        type: 'warning',
        title: 'Insights Unavailable',
        subtitle: 'Analysis Issue',
        description: 'I was unable to analyze your regional data at this moment. Please check the live map for current conditions.',
        icon: 'alert-circle'
      }];
    }
  }
}

export default new PyroSageService();