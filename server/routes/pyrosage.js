import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { pyrosageLimiter } from '../middleware/rateLimiter.js';
import { audit } from '../middleware/audit.js';
import PyroSageService from '../services/PyroSageService.js';

const router = Router();

/**
 * @swagger
 * /api/pyrosage/chat:
 *   post:
 *     tags: [PyroSage]
 *     summary: Send message to PyroSage AI assistant
 */
router.post(
  '/chat',
  authenticate,
  pyrosageLimiter,
  audit('pyrosage:chat'),
  async (req, res, next) => {
    try {
      const { message, conversationId, context } = req.body;
      const response = await PyroSageService.chat(
        req.user._id,
        message,
        conversationId,
        context
      );
      res.json({ success: true, data: response });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const conversations = await PyroSageService.getConversations(req.user._id);
    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    const conversation = await PyroSageService.getConversation(
      req.params.id,
      req.user._id
    );
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

router.delete('/conversations/:id', authenticate, async (req, res, next) => {
  try {
    await PyroSageService.deleteConversation(req.params.id, req.user._id);
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err) {
    next(err);
  }
});

router.get('/suggestions', authenticate, async (req, res, next) => {
  try {
    const suggestions = await PyroSageService.getSuggestions(
      req.user._id,
      req.query.region
    );
    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
});

router.get('/insights', authenticate, async (req, res, next) => {
  try {
    const insights = await PyroSageService.getInsights(
      req.user._id,
      req.query
    );
    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
});

export default router;