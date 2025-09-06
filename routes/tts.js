// /routes/tts.js
const express = require('express');
const googleTTS = require('../services/googleTTS');

const router = express.Router();

/**
 * Text-to-Speech endpoint
 * POST /api/tts
 */
router.post('/', async (req, res) => {
  try {
    const { text, voice, language } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text',
        code: 'MISSING_TEXT'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: 'Text too long (max 5000 characters)',
        code: 'TEXT_TOO_LONG'
      });
    }

    const options = {
      languageCode: language || 'es-ES',
      voiceName: voice || 'es-ES-Wavenet-D'
    };

    const result = await googleTTS.synthesize(text, options);

    res.json({
      success: result.success,
      audioContent: result.audioContent,
      format: result.format,
      provider: result.provider,
      text: text,
      options,
      note: result.note,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('TTS error:', error.message);
    res.status(500).json({
      error: 'Text-to-speech generation failed',
      code: 'TTS_ERROR',
      details: error.message
    });
  }
});

/**
 * Get available voices
 * GET /api/tts/voices
 */
router.get('/voices', (req, res) => {
  const voices = [
    { name: 'es-ES-Wavenet-D', language: 'es-ES', gender: 'Female' },
    { name: 'es-ES-Wavenet-B', language: 'es-ES', gender: 'Male' },
    { name: 'es-US-Wavenet-A', language: 'es-US', gender: 'Female' },
    { name: 'es-US-Wavenet-B', language: 'es-US', gender: 'Male' },
    { name: 'en-US-Wavenet-D', language: 'en-US', gender: 'Male' },
    { name: 'en-US-Wavenet-F', language: 'en-US', gender: 'Female' }
  ];

  res.json({
    success: true,
    voices,
    note: 'Requires GOOGLE_API_KEY for actual voice synthesis'
  });
});

module.exports = router;
