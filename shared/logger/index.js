function createLogger(winston, serviceName, options = {}) {
  const { combine, timestamp, printf, json } = winston.format;

  // Format dla ELK - czyste JSON
  const elkFormat = combine(
    timestamp(),
    json()
  );

  // Format dla konsoli (development)
  const consoleFormat = printf(({ level, message, timestamp, service }) => {
    return `${timestamp} [${level}] [${service}]: ${message}`;
  });

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || options.level || 'info',
    format: elkFormat, // JSON dla plików
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 5242880,
        maxFiles: 5 
      })
    ]
  });

  // Console transport z czytelnym formatem
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        timestamp(),
        consoleFormat
      )
    }));
  }

  return logger;
}

module.exports = { createLogger };