/**
 * Middleware do uwierzytelniania JWT
 */
const jwt = require('jsonwebtoken');
const gatewayConfig = require('../config/gateway.config.json');
const logger = require('../utils/logger');

/**
 * Lista publicznych tras, które nie wymagają uwierzytelnienia
 */
const publicRoutes = [
  '/users/register',
  '/users/login',
  '/users/health'
];

/**
 * Middleware do weryfikacji tokenu JWT z wyjątkami dla tras publicznych
 */
function authMiddleware(req, res, next) {
  // Sprawdzenie, czy trasa jest publiczna
  const requestPath = req.path;
  // return res.status(400).json({requestPath});
  if (publicRoutes.some(route => requestPath.endsWith(route))) {
    return next(); // Pomiń weryfikację tokenu dla tras publicznych
  }
  
  // Pobranie tokenu z nagłówka Authorization
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Brak tokenu uwierzytelniającego'
    });
  }
  
  // Wyodrębnienie tokenu
  const token = authHeader.split(' ')[1];
  
  try {
    // Weryfikacja tokenu
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || gatewayConfig.security.jwtSecret);
    // Dodanie danych użytkownika do obiektu żądania
    req.user = decoded;
    
    next();
  } catch (error) {
    logger.error('Błąd weryfikacji tokenu JWT:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token wygasł'
      });
    }
    
    return res.status(401).json({
      token: `${token}`,
      expectedToken: `${process.env.JWT_SECRET || gatewayConfig.security.jwtSecret}`,
      status: 'error',
      message: 'Nieprawidłowy token'
    });
  }
}

module.exports = authMiddleware;