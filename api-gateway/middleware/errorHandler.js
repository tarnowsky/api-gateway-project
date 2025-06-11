
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Globalny handler błędów:', err);
  
  const statusCode = err.statusCode || 500;
  
  const message = err.message || 'Wystąpił wewnętrzny błąd serwera';
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const responseBody = {
    status: 'error',
    message,
    ...(isDevelopment && { stack: err.stack })
  };
  
  res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;