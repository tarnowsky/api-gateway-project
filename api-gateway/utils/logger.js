/**
 * Konfiguracja logowania
 */
const winston = require('winston');
const gatewayConfig = require('../config/gateway.config.json');

// Konfiguracja formatu
const { combine, timestamp, printf, colorize } = winston.format;

// Własny format dla logów
const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Utworzenie instancji loggera
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || gatewayConfig.logging.level || 'info',
  format: combine(
    timestamp(),
    myFormat
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    // Logi błędów zapisywane do pliku
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Wszystkie logi zapisywane do pliku
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5 
    })
  ]
});

// W środowisku deweloperskim dodajemy transport konsolowy z kolorami
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp(),
      myFormat
    )
  }));
}

module.exports = logger;