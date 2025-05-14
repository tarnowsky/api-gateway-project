/**
 * Middleware do ograniczania liczby żądań (rate limiting)
 */
const rateLimit = require('express-rate-limit');
const gatewayConfig = require('../config/gateway.config.json');

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
  }
});

module.exports = rateLimiterMiddleware;