/**
 * API Gateway dla projektu mikrousług
 * Główny plik wejściowy aplikacji
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Importy własnych middleware
const corsMiddleware = require('./middleware/cors');
const authMiddleware = require('./middleware/auth');
const rateLimiterMiddleware = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const metrics = require('./utils/metrics');

// Importy konfiguracji
const gatewayConfig = require('./config/gateway.config.json');
const routes = require('./config/routes.json');

// Inicjalizacja aplikacji Express
const app = express();

const PORT = process.env.PORT || gatewayConfig.server.port || 8080;
// Port dla metryk Prometheus
const METRICS_PORT = process.env.METRICS_PORT || 9876;


// Middleware podstawowe
app.use(express.json())
app.use((req, res, next) => {
  console.log('[DEBUG] req.body:', req.body);
  next();
});
app.use(helmet()); // Zabezpieczenia HTTP
app.use(requestLogger); // Logowanie żądań
app.use(metrics.metricsMiddleware); // Zbieranie metryk
app.use((req, res, next) => {
  console.log(`[gateway] ${req.method} ${req.originalUrl}`);
  next();
});

// Endpoint dla health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString()
  });
});

// Endpoint dla informacji o API Gateway
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'API Gateway',
    version: '1.0.0',
    services: Object.keys(gatewayConfig.services)
  });
});

// Funkcja konfigurująca trasy proxy do mikrousług
function setupProxyRoutes() {
  routes.routes.sort((a, b) => b.path.length - a.path.length);
  routes.routes.forEach(route => {
    const { path, service, methods, auth, rateLimit, forwardPath } = route;
    const serviceConfig = gatewayConfig.services[service];
    
    if (!serviceConfig) {
      logger.error(`Nieznana usługa: ${service}`);
      return;
    }

    const middlewares = [];
    
    // Dodawanie middleware do uwierzytelniania jeśli potrzebne
    if (auth) {
      middlewares.push(authMiddleware);
    }
    
    // Dodawanie rate limitera jeśli potrzebne
    if (rateLimit) {
      middlewares.push(rateLimiterMiddleware);
    }
    
    // Konfiguracja proxy
    const proxyOptions = {
      target: serviceConfig.url,
      changeOrigin: true,
      pathRewrite: (path) => {
        return forwardPath || path;
      },
      logLevel: 'warn',
      onProxyReq: (proxyReq, req, res) => {
        // Dodawanie nagłówków do żądania proxy
        proxyReq.setHeader('x-api-gateway', 'true');
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.id);
        }
        // Ręczne przekazanie body
        if (req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      onError: (err, req, res) => {
        logger.error(`Błąd proxy dla ${service}:`, err);
        res.status(502).json({
          status: 'error',
          message: 'Usługa jest niedostępna'
        });
      }
    };
    
    // Rejestracja trasy z odpowiednimi middleware
    app.use(
      path,
      ...middlewares,
      createProxyMiddleware(proxyOptions)
    );
    
    logger.info(`Zarejestrowano trasę: ${path} -> ${serviceConfig.url}${forwardPath || path}`);
  });
}

// Konfiguracja tras proxy
setupProxyRoutes();

// Obsługa błędów
app.use(errorHandler);

// Obsługa nieznanych tras
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Nie znaleziono zasobu'
  });
});

// Uruchomienie serwera API
const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`API Gateway działa na porcie ${PORT}`);
});

// Utworzenie aplikacji do monitorowania
const metricsApp = express();
// Endpoint metryk Prometheus
metrics.createMetricsEndpoint(metricsApp);

// Uruchomienie serwera metryk
const metricsServer = http.createServer(metricsApp);

metricsServer.listen(METRICS_PORT, () => {
  logger.info(`Serwer metryk działa na porcie ${METRICS_PORT}`);
});

// Obsługa zamknięcia procesu
process.on('SIGTERM', () => {
  logger.info('Otrzymano sygnał SIGTERM, zamykanie API Gateway...');
  server.close(() => {
    logger.info('Serwer HTTP zamknięty');
    metricsServer.close(() => {
      logger.info('Serwer metryk zamknięty');
      process.exit(0);
    });
  });
});

module.exports = app;