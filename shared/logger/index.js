function createLogger(winston, serviceName, options = {}) {
  const { combine, timestamp, printf, colorize } = winston.format;

  const myFormat = printf(({ level, message, timestamp, service }) => {
    return `${timestamp} [${level}] [${service}]: ${message}`;
  });

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || options.level || 'info',
    format: combine(timestamp(), myFormat),
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

  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: combine(colorize(), timestamp(), myFormat)
    }));
  }

  return logger;
}

module.exports = { createLogger };