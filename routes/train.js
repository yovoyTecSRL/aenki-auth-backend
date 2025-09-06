// /routes/train.js
const express = require('express');
const ingestService = require('../services/ingest');
const personaService = require('../services/persona');

const router = express.Router();

/**
 * Train AeNKI with content
 * POST /api/train
 */
router.post('/', async (req, res) => {
  try {
    const { content, urls, metadata = {} } = req.body;

    if (!content && (!urls || urls.length === 0)) {
      return res.status(400).json({
        error: 'Must provide either content or urls',
        code: 'MISSING_CONTENT'
      });
    }

    const results = [];

    // Process direct content
    if (content) {
      console.log('📝 Training with direct content');
      const trainingResult = await personaService.trainAenki(content, {
        ...metadata,
        source: 'direct',
        type: 'text'
      });
      results.push(trainingResult);
    }

    // Process URLs
    if (urls && urls.length > 0) {
      console.log(`🌐 Processing ${urls.length} URLs`);
      
      for (const url of urls) {
        try {
          const ingestResult = await ingestService.ingestUrl(url);
          
          if (ingestResult.success) {
            const trainingResult = await personaService.trainAenki(ingestResult.content, {
              ...metadata,
              source: 'url',
              url: url,
              title: ingestResult.title,
              type: 'web'
            });
            results.push(trainingResult);
          } else {
            results.push({
              success: false,
              url,
              error: ingestResult.error
            });
          }
        } catch (error) {
          results.push({
            success: false,
            url,
            error: error.message
          });
        }
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    res.json({
      success: successful > 0,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        totalKnowledge: results[results.length - 1]?.totalKnowledge
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Training error:', error.message);
    res.status(500).json({
      error: 'Training failed',
      code: 'TRAINING_ERROR',
      details: error.message
    });
  }
});

/**
 * Get training status
 * GET /api/train/status
 */
router.get('/status', async (req, res) => {
  try {
    const stats = personaService.getAvatarStats();
    
    res.json({
      success: true,
      status: 'active',
      stats,
      capabilities: {
        urlIngestion: true,
        textTraining: true,
        whitelistedDomains: ingestService.allowedDomains.length,
        maxKnowledgeItems: process.env.MAX_KNOWLEDGE_ITEMS || 1000
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get training status',
      code: 'STATUS_ERROR'
    });
  }
});

module.exports = router;
