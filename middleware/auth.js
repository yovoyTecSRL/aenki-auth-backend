// /middleware/auth.js
const fetch = require('node-fetch');

/**
 * AeNKI Authentication Middleware
 * Validates x-aenki-key header using introspection service
 */
module.exports.requireAuth = async (req, res, next) => {
  try {
    // Skip authentication for health check
    if (req.path === '/api/health') {
      return next();
    }

    const key = req.header('x-aenki-key');
    if (!key) {
      return res.status(401).json({ 
        error: 'Missing x-aenki-key header',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    const introspectUrl = process.env.AENKI_AUTH_INTROSPECT_URL;
    
    // If no introspection service configured
    if (!introspectUrl) {
      // Allow in development mode only
      if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️  Auth service not configured - allowing in dev mode');
        req.aenki = { client_id: 'dev-mode', valid: true };
        return next();
      }
      
      return res.status(503).json({ 
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_UNAVAILABLE'
      });
    }

    // Introspect the API key
    const response = await fetch(introspectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': process.env.WEBHOOK_SECRET || 'dev-admin-token'
      },
      body: JSON.stringify({ api_key: key }),
      timeout: 5000
    });

    if (!response.ok) {
      console.log(`❌ Auth introspection failed: ${response.status}`);
      return res.status(401).json({ 
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    const authData = await response.json();
    
    if (!authData.valid) {
      return res.status(401).json({ 
        error: 'API key not valid',
        code: 'EXPIRED_OR_INVALID_KEY',
        details: authData.error
      });
    }

    // Attach auth info to request
    req.aenki = {
      client_id: authData.client_id,
      scopes: authData.scopes,
      valid: true,
      expires_at: authData.expires_at
    };

    console.log(`✅ Authenticated client: ${authData.client_id}`);
    return next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    // In development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️  Auth error in dev mode - allowing request');
      req.aenki = { client_id: 'dev-fallback', valid: true };
      return next();
    }

    return res.status(401).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional auth middleware - doesn't block if no key provided
 */
module.exports.optionalAuth = async (req, res, next) => {
  const key = req.header('x-aenki-key');
  if (!key) {
    req.aenki = { client_id: 'anonymous', valid: false };
    return next();
  }

  // Use same logic as requireAuth but don't block
  try {
    await module.exports.requireAuth(req, res, next);
  } catch (error) {
    req.aenki = { client_id: 'anonymous', valid: false };
    next();
  }
};
