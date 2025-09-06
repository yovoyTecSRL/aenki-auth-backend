// /routes/stats.js
const express = require('express');
const personaService = require('../services/persona');

const router = express.Router();

/**
 * Get AeNKI statistics
 * GET /api/stats
 */
router.get('/', async (req, res) => {
  try {
    const stats = personaService.getAvatarStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        server: {
          uptime: Math.floor(process.uptime()),
          memory: process.memoryUsage(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        },
        features: {
          textToSpeech: {
            enabled: !!process.env.GOOGLE_API_KEY,
            provider: 'Google Cloud TTS'
          },
          chatCompletion: {
            enabled: !!process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
          },
          fileProcessing: {
            enabled: true,
            supportedTypes: ['pdf', 'docx', 'txt', 'xlsx', 'images']
          },
          webScraping: {
            enabled: true,
            whitelistedDomains: 10
          }
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats error:', error.message);
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      code: 'STATS_ERROR'
    });
  }
});

/**
 * Get knowledge base statistics
 * GET /api/stats/knowledge
 */
router.get('/knowledge', async (req, res) => {
  try {
    const stats = personaService.getAvatarStats();
    
    res.json({
      success: true,
      knowledge: {
        totalItems: stats.knowledgeItems,
        lastUpdate: stats.lastKnowledgeUpdate,
        memoryUsage: stats.memoryUsage,
        trainingCount: stats.trainingCount,
        capabilities: {
          search: true,
          similarity: 'keyword-based',
          maxItems: process.env.MAX_KNOWLEDGE_ITEMS || 1000
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve knowledge statistics',
      code: 'KNOWLEDGE_STATS_ERROR'
    });
  }
});

/**
 * Get system health
 * GET /api/stats/health
 */
router.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    success: true,
    health: {
      status: 'healthy',
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        unit: 'MB'
      },
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        googleTTS: !!process.env.GOOGLE_API_KEY,
        authService: !!process.env.AENKI_AUTH_INTROSPECT_URL
      },
      environment: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

module.exports = router;
