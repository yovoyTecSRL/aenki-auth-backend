// 🤖 AeNKI Backend Server - Complete Avatar Integration
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || '127.0.0.1';

// Configuración completa de middleware
app.use(cors({
  origin: ['https://eternity.idotec.online', 'http://localhost:8001', 'http://127.0.0.1:8001', 'file://'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-aenki-key', 'x-admin-token']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static('public'));

// Logging mejorado
console.log('🚀 AeNKI Backend Server Initializing...');
console.log('🔑 OpenAI Key:', process.env.OPENAI_API_KEY ? 'CONFIGURED ✅' : 'MISSING ❌');
console.log('🔑 Google Key:', process.env.GOOGLE_API_KEY ? 'CONFIGURED ✅' : 'MISSING ❌');
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');

// Avatar chat memory
const avatarMemories = new Map();

// Función para obtener memoria de avatar
function getAvatarMemory(avatarId = 'default') {
  if (!avatarMemories.has(avatarId)) {
    avatarMemories.set(avatarId, {
      personality: "Soy AeNKI, tu asistente especializado en longevidad, bienestar y salud optimizada. Mi misión es ayudarte a vivir más y mejor, con información basada en la ciencia más reciente.",
      history: []
    });
  }
  return avatarMemories.get(avatarId);
}

// 🏥 Health check endpoint - Compatible con tu interfaz
app.get('/api/health', (req, res) => {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasGoogleKey = !!process.env.GOOGLE_API_KEY;
  
  res.json({
    ok: true,
    service: 'aenki-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    status: 'healthy',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    hasOpenAIKey,
    hasGoogleKey,
    port: PORT,
    endpoints: {
      health: 'GET /api/health',
      chat: 'POST /api/chat',
      tts: 'POST /api/tts',
      stats: 'GET /api/stats'
    }
  });
});

// 💬 Chat endpoint - Compatible con TalkingHead
app.post('/api/chat', async (req, res) => {
  try {
    const { text, history = [], avatarId = 'default' } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Missing text parameter', 
        code: 'MISSING_TEXT' 
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        reply: `Como AeNKI, puedo decirte que recibí tu mensaje: "${text}". Sin embargo, necesito que configures tu clave de OpenAI para darte respuestas completas. Te recomiendo mantener hábitos saludables y consultar con profesionales de la salud.`,
        model: 'simulation',
        usage: { prompt_tokens: 0, completion_tokens: 0 }
      });
    }

    // Obtener memoria del avatar
    const memory = getAvatarMemory(avatarId);
    
    // Construir contexto de conversación
    const messages = [
      {
        role: 'system',
        content: memory.personality
      },
      ...history.slice(-10), // Últimas 10 interacciones
      {
        role: 'user',
        content: text
      }
    ];

    console.log(`🤖 Processing chat for avatar ${avatarId}: "${text.substring(0, 50)}..."`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || 'No pude generar una respuesta.';

    // Actualizar memoria del avatar
    memory.history.push(
      { role: 'user', content: text },
      { role: 'assistant', content: reply }
    );
    
    // Mantener solo las últimas 20 interacciones
    if (memory.history.length > 40) {
      memory.history = memory.history.slice(-40);
    }

    console.log(`✅ Chat response generated for ${avatarId}`);

    res.json({
      reply,
      model: data.model,
      usage: data.usage,
      avatarId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({
      error: 'Chat processing failed',
      code: 'CHAT_ERROR',
      details: error.message,
      reply: 'Disculpa, tengo dificultades técnicas. Por favor intenta de nuevo en un momento.'
    });
  }
});

// 🗣️ TTS endpoint - Compatible con TalkingHead
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'es-ES-Standard-A', language = 'es-ES' } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ 
        error: 'Missing text parameter', 
        code: 'MISSING_TEXT' 
      });
    }

    if (!process.env.GOOGLE_API_KEY) {
      console.log('⚠️ Google API Key not found, returning simulation');
      return res.json({
        success: true,
        audioContent: Buffer.from(`SIMULATED_TTS_${text.length}_${Date.now()}`).toString('base64'),
        format: 'mp3',
        provider: 'simulation',
        text: text,
        voice: voice,
        note: 'Configure GOOGLE_API_KEY for real TTS'
      });
    }

    console.log(`🗣️ Generating TTS for: "${text.substring(0, 50)}..." using voice: ${voice}`);

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: language,
          name: voice
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: 0,
          speakingRate: 1.0
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google TTS API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    console.log('✅ TTS generated successfully');

    res.json({
      success: true,
      audioContent: data.audioContent,
      format: 'mp3',
      provider: 'google',
      text: text,
      voice: voice,
      language: language,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ TTS error:', error.message);
    res.status(500).json({
      error: 'TTS generation failed',
      code: 'TTS_ERROR',
      details: error.message
    });
  }
});

// 📊 Stats endpoint
app.get('/api/stats', (req, res) => {
  const avatarCount = avatarMemories.size;
  const totalInteractions = Array.from(avatarMemories.values())
    .reduce((total, memory) => total + memory.history.length, 0);
  
  res.json({
    success: true,
    service: 'aenki-backend',
    avatars: {
      total: avatarCount,
      active: avatarCount
    },
    interactions: {
      total: totalInteractions,
      sessions: avatarCount
    },
    capabilities: {
      textToSpeech: !!process.env.GOOGLE_API_KEY,
      chatCompletion: !!process.env.OPENAI_API_KEY,
      continuousLearning: process.env.CONTINUOUS_LEARNING === 'true',
      healthResearch: process.env.HEALTH_RESEARCH_MODE === 'true'
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// 🚀 Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AeNKI Backend Service',
    version: '1.0.0',
    status: 'running',
    mode: process.env.NODE_ENV || 'development',
    port: PORT,
    endpoints: {
      health: 'GET /api/health',
      chat: 'POST /api/chat',
      tts: 'POST /api/tts',
      stats: 'GET /api/stats'
    },
    avatarSupport: true,
    talkingHeadCompatible: true,
    description: 'Backend optimized for TalkingHead avatar integration'
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error.message);
  console.error('Stack:', error.stack);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// 404 handler  
app.use((req, res) => {
  console.log(`❓ 404 - Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
    availableEndpoints: {
      health: 'GET /api/health',
      chat: 'POST /api/chat', 
      tts: 'POST /api/tts',
      stats: 'GET /api/stats'
    }
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('🚀 AeNKI Backend Server Started Successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
  console.log(`🔗 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`💬 Chat Endpoint: http://${HOST}:${PORT}/api/chat`);
  console.log(`🗣️ TTS Endpoint: http://${HOST}:${PORT}/api/tts`);
  console.log(`📊 Stats: http://${HOST}:${PORT}/api/stats`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ READY' : '❌ NOT CONFIGURED'}`);
  console.log(`🗣️ Google TTS: ${process.env.GOOGLE_API_KEY ? '✅ READY' : '❌ NOT CONFIGURED'}`);
  console.log(`🎭 TalkingHead Compatible: ✅ YES`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
