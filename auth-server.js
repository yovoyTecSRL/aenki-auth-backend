// AeNKI Auth Server - Minimal JWT Implementation
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Configuration
const MODE = (process.env.AE_NKI_MODE || 'jwt').toLowerCase();
const SECRET = process.env.AE_NKI_JWT_SECRET || 'change_me_in_production';
const TTL_MIN = parseInt(process.env.AE_NKI_JWT_TTL_MIN || '120', 10);
const ISSUER = process.env.AE_NKI_ISSUER || 'aenki.local';
const ADMIN = process.env.AE_NKI_ADMIN_TOKEN || 'admin-boot';

// JWT issuer function
const issue = (sub = 'client:web', scopes = ['tts', 'chat', 'train', 'search']) =>
  jwt.sign({ scopes }, SECRET, { 
    issuer: ISSUER, 
    subject: sub, 
    expiresIn: `${TTL_MIN}m` 
  });

// Health check
app.get('/health', (_, res) => res.json({ 
  ok: true, 
  mode: MODE,
  service: 'aenki-auth',
  version: '1.0.0',
  timestamp: new Date().toISOString()
}));

// Issue API key (Admin only)
app.post('/auth/issue', (req, res) => {
  const adminToken = req.header('x-admin-token');
  
  if (adminToken !== ADMIN) {
    return res.status(403).json({ 
      error: 'Forbidden: Invalid admin token',
      code: 'INVALID_ADMIN_TOKEN'
    });
  }

  if (MODE === 'static') {
    return res.json({ 
      mode: 'static', 
      apikey: process.env.AE_NKI_STATIC_KEY || 'orbix-dev' 
    });
  }

  const clientId = req.body?.client_id || 'web';
  const subject = `client:${clientId}`;
  const apikey = issue(subject);

  return res.json({ 
    success: true,
    mode: 'jwt', 
    api_key: apikey,
    client_id: clientId,
    ttl_min: TTL_MIN,
    issued_at: new Date().toISOString()
  });
});

// Introspect API key
app.get('/auth/introspect', (req, res) => {
  const key = req.header('x-aenki-key');
  
  if (!key) {
    return res.status(401).json({ 
      valid: false,
      error: 'Missing x-aenki-key header',
      code: 'MISSING_API_KEY'
    });
  }

  try {
    const data = jwt.verify(key, SECRET, { issuer: ISSUER });
    return res.json({ 
      valid: true, 
      client_id: data.sub,
      scopes: data.scopes,
      issuer: data.iss,
      issued_at: new Date(data.iat * 1000).toISOString(),
      expires_at: new Date(data.exp * 1000).toISOString()
    });
  } catch (e) {
    return res.status(401).json({ 
      valid: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      details: e.message
    });
  }
});

// POST version for backend integration
app.post('/auth/introspect', (req, res) => {
  const key = req.body?.api_key || req.header('x-aenki-key');
  
  if (!key) {
    return res.status(400).json({ 
      valid: false,
      error: 'Missing api_key in body or x-aenki-key header',
      code: 'MISSING_API_KEY'
    });
  }

  try {
    const data = jwt.verify(key, SECRET, { issuer: ISSUER });
    return res.json({ 
      valid: true, 
      client_id: data.sub,
      scopes: data.scopes,
      issuer: data.iss,
      issued_at: new Date(data.iat * 1000).toISOString(),
      expires_at: new Date(data.exp * 1000).toISOString()
    });
  } catch (e) {
    return res.json({ 
      valid: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
});

// Test secure endpoint
app.get('/secure/echo', (req, res) => {
  const key = req.header('x-aenki-key');
  
  try {
    const data = jwt.verify(key, SECRET, { issuer: ISSUER });
    return res.json({ 
      message: req.query.msg || 'Hello from AeNKI Auth!',
      who: data.sub,
      scopes: data.scopes,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    return res.status(401).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available: [
      'GET /health',
      'POST /auth/issue',
      'GET /auth/introspect',
      'POST /auth/introspect',
      'GET /secure/echo'
    ]
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '8005', 10);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🔐 AeNKI Auth running on port ${PORT}`);
  console.log(`Mode: ${MODE}`);
  console.log(`Issuer: ${ISSUER}`);
  console.log(`TTL: ${TTL_MIN} minutes`);
});

module.exports = app;
