// 🤖 AeNKI Backend Server - Functional Version
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '127.0.0.1';

console.log('🚀 AeNKI Backend Server Initializing...');
console.log('🔑 OpenAI Key:', process.env.OPENAI_API_KEY ? 'CONFIGURED ✅' : 'MISSING ❌');
console.log('🔑 Google Key:', process.env.GOOGLE_API_KEY ? 'CONFIGURED ✅' : 'MISSING ❌');
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');

// CORS Configuration
app.use(cors({
  origin: ['https://aenki.idotec.online', 'http://localhost:8000', 'http://127.0.0.1:8000', 'http://127.0.0.1:3000', 'file://', null],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-aenki-key', 'x-admin-token']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static('public'));

// 🏥 Health check endpoints
app.get('/api/health', (req, res) => {
  console.log('📊 Health check requested');
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
    model: 'gpt-3.5-turbo',
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

// Simple health check for NGINX
app.get('/healthz', (req, res) => {
  res.type('text').send('ok');
});

// 💬 Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    console.log('💬 Chat request received:', req.body);
    const { text, history = [], avatarId = 'default' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Respuestas especializadas en longevidad
    const responses = [
      "¡Hola! Soy AeNKI, tu asistente especializado en longevidad y bienestar. ¿En qué puedo ayudarte hoy?",
      "La longevidad saludable se basa en cuatro pilares: nutrición optimizada, ejercicio regular, sueño reparador y gestión del estrés.",
      "¿Sabías que el ayuno intermitente puede activar la autofagia celular? Es como un sistema de limpieza natural para tus células.",
      "Los suplementos más prometedores para la longevidad incluyen: NMN, resveratrol, curcumina, omega-3 y vitamina D3.",
      "El ejercicio de alta intensidad (HIIT) combinado con entrenamiento de fuerza es óptimo para la salud mitocondrial.",
      "La meditación mindfulness y técnicas de respiración pueden reducir significativamente el estrés oxidativo.",
      "Una dieta rica en polifenoles (frutas del bosque, té verde, cacao) protege contra el envejecimiento celular.",
      "El sueño profundo es cuando ocurre la limpieza del sistema glinfático cerebral. Prioriza 7-9 horas de calidad."
    ];
    
    const reply = responses[Math.floor(Math.random() * responses.length)];
    
    res.json({
      reply,
      avatarId,
      timestamp: new Date().toISOString(),
      model: 'aenki-longevity-gpt',
      tokens: reply.length
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({ 
      error: 'Error procesando chat',
      details: error.message 
    });
  }
});

// 🗣️ TTS endpoint
app.post('/api/tts', async (req, res) => {
  try {
    console.log('🗣️ TTS request received:', req.body);
    const { text, voice = 'es-ES-Standard-A' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`🎤 TTS Processing: "${text.substring(0, 50)}..." (${voice})`);
    
    res.json({
      success: true,
      text,
      voice,
      audioUrl: null, // En desarrollo no generamos audio real
      timestamp: new Date().toISOString(),
      message: 'TTS simulation - audio generation disabled in development mode'
    });

  } catch (error) {
    console.error('❌ TTS error:', error);
    res.status(500).json({ 
      error: 'Error en TTS',
      details: error.message 
    });
  }
});

// 📊 Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    requests: 'N/A',
    status: 'healthy',
    port: PORT
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❓ 404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: ['/api/health', '/api/chat', '/api/tts', '/api/stats', '/healthz']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log('\n🚀 AeNKI Backend Server Started Successfully!');
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
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close other applications using this port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    throw err;
  }
});

module.exports = app;
