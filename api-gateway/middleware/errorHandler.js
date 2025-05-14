/**
 * Middleware do globalnej obsługi błędów
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Logowanie błędu
  logger.error('Globalny handler błędów:', err);
  
  // Status błędu (domyślnie 500 jeśli nie jest zdefiniowany)
  const statusCode = err.statusCode || 500;
  
  // Komunikat błędu (domyślny dla 500 jeśli nie jest zdefiniowany)
  const message = err.message || 'Wystąpił wewnętrzny błąd serwera';
  
  // W środowisku produkcyjnym nie ujawniaj szczegółów błędów
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const responseBody = {
    status: 'error',
    message,
    ...(isDevelopment && { stack: err.stack })
  };
  
  res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;