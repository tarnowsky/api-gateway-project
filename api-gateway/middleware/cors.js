/**
 * Middleware do konfiguracji CORS
 */
const cors = require('cors');

function corsMiddleware() {
  return cors({
    origin: (origin, callback) => {
      // W środowisku produkcyjnym można ograniczyć do konkretnych domen
      // np. const allowedOrigins = ['https://example.com', 'https://www.example.com'];
      
      // Na potrzeby rozwoju zezwalamy na wszystkie źródła
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400 // 24 godziny
  });
}

module.exports = corsMiddleware;