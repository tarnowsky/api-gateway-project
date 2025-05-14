/**
 * Konfiguracja metryki dla prometheus
 */
const promClient = require('prom-client');
const express = require('express');
const logger = require('./logger');

// Utworzenie rejestru metryki
const register = new promClient.Registry();

// Dodanie domyślnych metryk
promClient.collectDefaultMetrics({ register });

// Konfiguracja licznika żądań HTTP
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Czas trwania żądań HTTP w sekundach',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// Konfiguracja licznika żądań
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Łączna liczba żądań HTTP',
  labelNames: ['method', 'route', 'status_code']
});

// Rejestracja metryk
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);

/**
 * Middleware do mierzenia czasu żądań
 */
function metricsMiddleware(req, res, next) {
  const end = httpRequestDurationMicroseconds.startTimer();
  
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    // Zakończenie pomiaru czasu
    end({ method, route, status_code: statusCode });
    
    // Inkrementacja licznika żądań
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
  });
  
  next();
}

/**
 * Funkcja tworząca endpoint dla metryk
 */
function createMetricsEndpoint(app, path = '/metrics') {
  app.get(path, async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      logger.error('Błąd podczas generowania metryk', err);
      res.status(500).end();
    }
  });
  
  logger.info(`Endpoint metryk dostępny pod adresem: ${path}`);
}

module.exports = {
  register,
  metricsMiddleware,
  createMetricsEndpoint,
  httpRequestDurationMicroseconds,
  httpRequestsTotal
};