const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '127.0.0.1';

// ===== CORS Configuration =====
const corsOrigins = process.env.CORS_ORIGIN ? 
  process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
  ['http://127.0.0.1:8000', 'file://'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow null/undefined origin (for file:// or Postman/direct access)
    if (!origin || origin === 'null') return callback(null, true);
    if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      return callback(null, true);
    }
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-aenki-key', 'x-admin-token']
}));

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// ===== Middleware =====
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Auth Middleware =====
const requireAuth = async (req, res, next) => {
  const token = req.headers['x-aenki-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // In production, require authentication
  if (process.env.NODE_ENV === 'production') {
    if (!token) {
      return res.status(401).json({ error: 'Missing x-aenki-key header' });
    }

    // If introspect URL is configured, validate token
    if (process.env.AENKI_AUTH_INTROSPECT_URL) {
      try {
        const fetch = require('node-fetch');
        const response = await fetch(process.env.AENKI_AUTH_INTROSPECT_URL, {
          headers: { 'x-aenki-key': token }
        });
        
        if (!response.ok) {
          return res.status(401).json({ error: 'Invalid authentication token' });
        }
      } catch (error) {
        console.error('🔐 Auth introspection failed:', error.message);
        return res.status(503).json({ error: 'Authentication service unavailable' });
      }
    }
  } else {
    // In development, just log the warning
    if (!token) {
      console.warn('⚠️  DEV MODE: No x-aenki-key provided - this would fail in production');
    } else {
      console.log(`🔐 DEV AUTH: Using token ${token.substring(0, 8)}...`);
    }
  }
  
  next();
};

// ===== Health Endpoints (NO AUTH) =====
app.get('/api/health', (req, res) => {
  console.log('📊 Health check requested');
  
  const health = {
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: require('./package.json').version,
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    host: HOST,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasGoogleKey: !!process.env.GOOGLE_API_KEY,
    memory: process.memoryUsage(),
    corsOrigins: corsOrigins
  };
  
  res.json(health);
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// ===== Chat Route (WITH AUTH) =====
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { text, history = [], avatarId = 'default' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`💬 Chat request: "${text.substring(0, 50)}..." from avatarId: ${avatarId}`);

    // Mock response focused on longevity and health
    const longevityResponses = [
      `Sobre longevidad y "${text}": Los estudios más recientes muestran que los hábitos de vida son clave. Te recomiendo enfocarte en nutrición personalizada, ejercicio regular y gestión del estrés.`,
      `Respecto a "${text}" en el contexto de vida saludable: La investigación indica que la combinación de actividad física, sueño de calidad y conexiones sociales puede extender significativamente la esperanza de vida.`,
      `En cuanto a "${text}" y la longevidad: Los científicos han identificado que factores como la dieta mediterránea, la meditación y el propósito de vida son fundamentales para el envejecimiento saludable.`,
      `Sobre "${text}" y el bienestar: Los últimos avances en medicina preventiva sugieren que el monitoreo regular de biomarcadores y la optimización hormonal pueden ser muy beneficiosos.`
    ];

    const randomResponse = longevityResponses[Math.floor(Math.random() * longevityResponses.length)];

    res.json({
      reply: randomResponse,
      avatarId,
      timestamp: new Date().toISOString(),
      model: process.env.OPENAI_MODEL || 'mock-longevity-model'
    });

  } catch (error) {
    console.error('💥 Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// ===== TTS Route (WITH AUTH) =====
app.post('/api/tts', requireAuth, async (req, res) => {
  try {
    const { text, voice = 'es-ES-Standard-A', lang = 'es-ES' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    console.log(`🗣️  TTS request: "${text.substring(0, 50)}..." (${voice})`);

    // Mock TTS response - simulated base64 audio
    const mockAudioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCSU=';

    res.json({
      audio: mockAudioData,
      text,
      voice,
      lang,
      duration: Math.floor(text.length * 0.1), // Mock duration
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 TTS error:', error);
    res.status(500).json({ error: 'Failed to generate TTS audio' });
  }
});

// ===== Stats Route (WITH AUTH) =====
app.get('/api/stats', requireAuth, (req, res) => {
  console.log('📊 Stats requested');
  
  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    },
    aenki: {
      totalChats: Math.floor(Math.random() * 1000) + 100,
      totalTTS: Math.floor(Math.random() * 500) + 50,
      activeUsers: Math.floor(Math.random() * 10) + 1,
      healthResearchQueries: Math.floor(Math.random() * 200) + 20
    },
    timestamp: new Date().toISOString()
  });
});

// ===== Mock routes for missing route files =====
app.get('/api/train', requireAuth, (req, res) => {
  res.json({ message: 'Training endpoint - coming soon', status: 'mock' });
});

app.post('/api/upload', requireAuth, (req, res) => {
  res.json({ message: 'Upload endpoint - coming soon', status: 'mock' });
});

app.get('/api/search', requireAuth, (req, res) => {
  res.json({ message: 'Search endpoint - coming soon', status: 'mock' });
});

// ===== Static Files =====
app.use('/', express.static(path.join(__dirname, 'public')));

// Serve main HTML files at root
app.get('/aenki.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'aenki.html'));
});

app.get('/avatar-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'avatar-test.html'));
});

// Default route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send(`
        <html>
          <head><title>AeNKI Backend</title></head>
          <body>
            <h1>🤖 AeNKI Backend Server</h1>
            <p>Server running on port ${PORT}</p>
            <ul>
              <li><a href="/api/health">Health Check</a></li>
              <li><a href="/aenki.html">AeNKI Avatar Interface</a></li>
              <li><a href="/avatar-test.html">Avatar Test</a></li>
            </ul>
          </body>
        </html>
      `);
    }
  });
});

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ===== 404 Handler =====
app.use((req, res) => {
  console.warn(`❓ 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found' });
});

// ===== Server Start =====
const server = app.listen(PORT, HOST, () => {
  console.log('🚀 AeNKI Backend Server Started Successfully!');
  console.log(`📡 Server: http://${HOST}:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Auth Mode: ${process.env.NODE_ENV === 'production' ? 'STRICT' : 'DEVELOPMENT'}`);
  console.log(`🎯 CORS Origins: ${corsOrigins.join(', ')}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🗣️  Google TTS: ${process.env.GOOGLE_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`📊 Health endpoint: http://${HOST}:${PORT}/api/health`);
  console.log('🎉 Ready to serve AeNKI requests!');
});

// ===== Graceful Shutdown =====
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down AeNKI server gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

module.exports = app;
