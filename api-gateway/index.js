/**
 * API Gateway dla projektu mikrousług
 * Główny plik wejściowy aplikacji
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
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
const path = require('path');

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
app.use(helmet()); // Zabezpieczenia HTTP
app.use(requestLogger); // Logowanie żądań
app.use(corsMiddleware);


app.use(express.static(path.join(__dirname, 'public')));

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Endpoint dla health check


// Funkcja konfigurująca trasy proxy do mikrousług
function setupProxyRoutes() {
  routes.routes.sort((a, b) => b.path.length - a.path.length);
  routes.routes.forEach(routeConfig => { // Renamed 'route' to 'routeConfig' to avoid conflict
    const { path: routePath, service, methods, auth, rateLimit, forwardPath } = routeConfig; // Renamed 'path' to 'routePath'
    const serviceConfig = gatewayConfig.services[service];

    if (!serviceConfig) {
      logger.error(`Nieznana usługa: ${service}`);
      return;
    }

    const routeSpecificMiddlewares = [];

    // Middleware to set the matched route pattern for metrics
    const metricsRouteSetter = (req, res, next) => {
      req.matchedRoutePattern = routePath; // Store the matched path pattern
      next();
    };
    routeSpecificMiddlewares.push(metricsRouteSetter);

    // Add auth middleware if needed
    if (auth) {
      routeSpecificMiddlewares.push(authMiddleware);
    }

    // Add rate limiter if needed
    if (rateLimit) {
      routeSpecificMiddlewares.push(rateLimiterMiddleware);
    }

    // Add the actual metrics middleware now that req.matchedRoutePattern is set
    routeSpecificMiddlewares.push(metrics.metricsMiddleware);

    // Proxy configuration
    const proxyOptions = {
      target: serviceConfig.url,
      changeOrigin: true,
      pathRewrite: (originalPath) => { // 'originalPath' is the argument here
        return forwardPath || originalPath;
      },
      logLevel: 'warn',
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('x-api-gateway', 'true');
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.id);
        }
        if (req.body && Object.keys(req.body).length > 0) { // Check if body is not empty
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      onError: (err, req, res) => {
        logger.error(`Błąd proxy dla ${service}:`, err);

        // Record proxy error for metrics
        metrics.recordProxyError(service, err.code || 'unknown');

        // Important: Ensure metrics are recorded even on proxy error
        if (!res.headersSent) {
          res.status(502).json({
            status: 'error',
            message: 'Usługa jest niedostępna'
          });
        } else {
          // If headers already sent, just end the response
          res.end();
        }
      }
    };

    // Register route with middlewares and proxy
    app.use(
      routePath, // Use the original path for matching
      ...routeSpecificMiddlewares,
      createProxyMiddleware(proxyOptions)
    );

    logger.info(`Zarejestrowano trasę: ${routePath} -> ${serviceConfig.url}${forwardPath || routePath}`);
  });
}

// Konfiguracja tras proxy
setupProxyRoutes();

metrics.startServiceHealthCheck(gatewayConfig.services);

app.use(metrics.metricsMiddleware);

app.get('/health', rateLimiterMiddleware, (req, res) => {
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