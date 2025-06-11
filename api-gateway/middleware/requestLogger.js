/**
 * Middleware do logowania żądań
 */
const morgan = require('morgan');
const logger = require('../utils/logger');


morgan.token('body', (req) => {
  const body = { ...req.body };
  if (body.password) body.password = '[HIDDEN]';
  if (body.passwordConfirmation) body.passwordConfirmation = '[HIDDEN]';
  
  return JSON.stringify(body);
});

const logFormat = ':remote-addr :method :url :status :res[content-length] - :response-time ms :body';

const requestLogger = morgan(logFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
});

module.exports = requestLogger;