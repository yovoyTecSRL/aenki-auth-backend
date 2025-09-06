// /middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const morgan = require('morgan');
const express = require('express');

/**
 * Configure CORS middleware
 */
function setupCors() {
  const origins = process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : 
    ['http://localhost:8000', 'https://aenki.idotec.online'];

  return cors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'x-aenki-key', 
      'x-admin-token'
    ],
    credentials: true
  });
}

/**
 * Configure rate limiting
 */
function setupRateLimit() {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/api/health'
  });
}

/**
 * Setup logging middleware
 */
function setupLogging() {
  const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
  return morgan(format);
}

/**
 * Setup body parsing middleware
 */
function setupBodyParser() {
  return [
    express.json({ limit: '2mb' }),
    express.urlencoded({ extended: true, limit: '2mb' })
  ];
}

/**
 * Apply all middleware in correct order
 */
function applyMiddleware(app) {
  // Security and logging
  app.use(setupCors());
  app.use(setupLogging());
  
  // Body parsing
  app.use(...setupBodyParser());
  
  // Rate limiting (apply after body parsing)
  app.use(setupRateLimit());

  console.log('✅ Middleware configured:');
  console.log(`   CORS Origins: ${process.env.CORS_ORIGIN || 'default'}`);
  console.log(`   Rate Limit: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} req/15min`);
  console.log(`   Body Limit: 2MB`);
}

module.exports = {
  setupCors,
  setupRateLimit, 
  setupLogging,
  setupBodyParser,
  applyMiddleware
};
