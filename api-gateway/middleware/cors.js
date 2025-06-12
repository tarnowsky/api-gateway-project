/**
 * Middleware do konfiguracji CORS
 */
const cors = require('cors');
const logger = require('../utils/logger');

const corsMiddleware = (req, res, next) => {
  if (req.headers['x-test-cors'] === 'true') {
    logger.error(`CORS Error: Access blocked by CORS policy - Authorization header not allowed`);
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Access blocked by CORS policy - Authorization header not allowed',
      blockedBy: 'X-Test-CORS simulation'
    });
  }

  const corsConfig = cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Test-CORS'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400
  });

  corsConfig(req, res, next);
};

module.exports = corsMiddleware;