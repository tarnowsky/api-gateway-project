/**
 * Middleware do ograniczania liczby żądań (rate limiting)
 */
const rateLimit = require('express-rate-limit');
const gatewayConfig = require('../config/gateway.config.json');
const metrics = require('../utils/metrics');

const rateLimiterMiddleware = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || gatewayConfig.rateLimit.windowMs || 15 * 60 * 1000, // 15 minut domyślnie
  max: process.env.RATE_LIMIT_MAX || gatewayConfig.rateLimit.max || 100, // limit 100 żądań na windowMs domyślnie
  standardHeaders: true, // Zwraca nagłówki `RateLimit-*` w odpowiedzi
  legacyHeaders: false, // Wyłącza nagłówki `X-RateLimit-*`
  message: {
    status: 'error',
    message: 'Zbyt wiele żądań z tego adresu IP, spróbuj ponownie później'
  },
  // Funkcja określająca klucz dla limitu (domyślnie IP)
  keyGenerator: (req) => {
    // Można zmienić sposób identyfikacji klienta, np. na podstawie tokenu API
    return req.ip;
  },
  // handler for when rate limit is exceeded
  handler: (req, res) => {
    // Record rate limit exceeded
    const route = req.matchedRoutePattern || req.originalUrl;
    const service = getServiceFromRoute(route) || 'unknown';
    metrics.recordRateLimitExceeded(route, service);
    
    res.status(429).json({
      status: 'error',
      message: 'Zbyt wiele żądań z tego adresu IP, spróbuj ponownie później'
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