/**
 * Middleware do ograniczania liczby żądań (rate limiting)
 */
const rateLimit = require('express-rate-limit');
const gatewayConfig = require('../config/gateway.config.json');
const metrics = require('../utils/metrics');
const logger = require('../utils/logger');

const msg = 'Too many requests from this IP address, please try again later';
const rateLimiterMiddleware = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || gatewayConfig.rateLimit.windowMs || 15 * 60 * 1000, 
  max: process.env.RATE_LIMIT_MAX || gatewayConfig.rateLimit.max || 100, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: {
    status: 'error',
    message: msg
  },
  keyGenerator: (req) => {
    // Could be changed for Token or smth
    return req.ip;
  },
  // handler for when rate limit is exceeded
  handler: (req, res) => {
    // Record rate limit exceeded
    const route = req.matchedRoutePattern || req.originalUrl;
    const service = getServiceFromRoute(route) || 'unknown';
    metrics.recordRateLimitExceeded(route, service);
    logger.error(`Rate Limiter Error: ${msg}`);
    
    res.status(429).json({
      status: 'error',
      message: msg
    });
  }
});

function getServiceFromRoute(routePattern) {
  if (!routePattern) return null;
  
  try {
    const routes = require('../config/routes.json');
    const matchedRoute = routes.routes.find(route => route.path === routePattern);
    return matchedRoute ? matchedRoute.service : null;
  } catch (error) {
    return null;
  }
}

module.exports = rateLimiterMiddleware;