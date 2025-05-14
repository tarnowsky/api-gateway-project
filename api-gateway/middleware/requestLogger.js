/**
 * Middleware do logowania żądań
 */
const morgan = require('morgan');
const logger = require('../utils/logger');


// Tworzenie własnego formatu logowania Morgan
morgan.token('body', (req) => {
  // W środowisku produkcyjnym należy uważać, aby nie logować wrażliwych danych
  // Tutaj usuwamy hasła z ciała żądania przed logowaniem
  const body = { ...req.body };
  if (body.password) body.password = '[HIDDEN]';
  if (body.passwordConfirmation) body.passwordConfirmation = '[HIDDEN]';
  
  return JSON.stringify(body);
});

// Własny format logowania
const logFormat = ':remote-addr :method :url :status :res[content-length] - :response-time ms :body';

// Adapter Morgan dla naszego loggera
const requestLogger = morgan(logFormat, {
  stream: {
    write: (message) => {
      // Usuwanie znaku nowej linii, który Morgan dodaje na końcu
      logger.info(message.trim());
    }
  }
});

module.exports = requestLogger;