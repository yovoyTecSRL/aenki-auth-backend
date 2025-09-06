// /routes/chat.js
const express = require('express');
const openaiService = require('../services/openai');
const personaService = require('../services/persona');

const router = express.Router();

/**
 * Chat with AeNKI
 * POST /api/chat
 */
router.post('/', async (req, res) => {
  try {
    const { 
      message, 
      context = {},
      searchKnowledge = true,
      maxTokens = 1000 
    } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Missing required field: message',
        code: 'MISSING_MESSAGE'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'Message too long (max 2000 characters)',
        code: 'MESSAGE_TOO_LONG'
      });
    }

    let relevantKnowledge = [];

    // Search for relevant knowledge if enabled
    if (searchKnowledge) {
      const searchResult = await personaService.searchKnowledge(message, 0.6, 3);
      if (searchResult.success) {
        relevantKnowledge = searchResult.results;
      }
    }

    // Prepare chat context
    const chatContext = {
      ...context,
      knowledge: relevantKnowledge,
      maxTokens
    };

    // Get response from OpenAI service
    const response = await openaiService.chatWithAenki(message, chatContext);

    res.json({
      success: response.success,
      message: message,
      response: response.response,
      model: response.model,
      provider: response.provider,
      knowledgeUsed: relevantKnowledge.length,
      usage: response.usage,
      timestamp: response.timestamp,
      client: req.aenki?.client_id || 'unknown'
    });

  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({
      error: 'Chat processing failed',
      code: 'CHAT_ERROR',
      details: error.message
    });
  }
});

/**
 * Get chat capabilities
 * GET /api/chat/capabilities
 */
router.get('/capabilities', (req, res) => {
  const stats = personaService.getAvatarStats();
  
  res.json({
    success: true,
    capabilities: {
      chatCompletion: !!process.env.OPENAI_API_KEY,
      knowledgeSearch: true,
      knowledgeItems: stats.knowledgeItems,
      continuousLearning: stats.capabilities.continuousLearning,
      healthResearch: stats.capabilities.healthResearch
    },
    models: {
      primary: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      fallback: 'simulation'
    },
    limitations: {
      maxMessageLength: 2000,
      maxTokens: 2000,
      knowledgeSearchThreshold: 0.6
    }
  });
});

/**
 * Get conversation history (placeholder)
 * GET /api/chat/history
 */
router.get('/history', (req, res) => {
  // In a production system, you'd store conversation history
  res.json({
    success: true,
    history: [],
    note: 'Conversation history not implemented in this version'
  });
});

module.exports = router;
