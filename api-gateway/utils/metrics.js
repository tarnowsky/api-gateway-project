const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP request counter
const httpRequestCounter = new client.Counter({
    name: 'gateway_http_requests_total',
    help: 'Total number of HTTP requests through gateway',
    labelNames: ['method', 'route', 'service', 'status_code'],
    registers: [register]
});

// HTTP request duration
const httpRequestDuration = new client.Histogram({
    name: 'gateway_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'service', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5, 10],
    registers: [register]
});

// Service availability gauge
const serviceAvailability = new client.Gauge({
    name: 'gateway_service_availability',
    help: 'Service availability (1 = up, 0 = down)',
    labelNames: ['service'],
    registers: [register]
});

// Rate limit counter
const rateLimitCounter = new client.Counter({
    name: 'gateway_rate_limit_exceeded_total',
    help: 'Total number of rate limit exceeded',
    labelNames: ['route', 'service'],
    registers: [register]
});

// Active connections gauge
const activeConnections = new client.Gauge({
    name: 'gateway_active_connections',
    help: 'Number of active connections',
    registers: [register]
});

// Proxy errors counter
const proxyErrorCounter = new client.Counter({
    name: 'gateway_proxy_errors_total',
    help: 'Total number of proxy errors',
    labelNames: ['service', 'error_type'],
    registers: [register]
});

// Data transfer metrics
const dataTransferred = new client.Counter({
    name: 'gateway_data_transferred_bytes_total',
    help: 'Total bytes transferred',
    labelNames: ['direction', 'service'], // direction: 'in' or 'out'
    registers: [register]
});

// Authentication metrics
const authCounter = new client.Counter({
    name: 'gateway_auth_attempts_total',
    help: 'Total authentication attempts',
    labelNames: ['status', 'route'], // status: 'success' or 'failure'
    registers: [register]
});

// Track service routing
const serviceRoutingCounter = new client.Counter({
    name: 'gateway_service_routing_total',
    help: 'Total requests routed to each service',
    labelNames: ['service', 'method'],
    registers: [register]
});

// Update active connections
let connectionCount = 0;

function updateConnectionCount(delta) {
    connectionCount += delta;
    activeConnections.set(connectionCount);
}

// Enhanced middleware for metrics
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    updateConnectionCount(1);

    // Extract service from route configuration
    const service = getServiceFromRoute(req.matchedRoutePattern);

    let connectionDecremented = false; // Add this flag

    const decrementConnection = () => {
        if (!connectionDecremented) {
            updateConnectionCount(-1);
            connectionDecremented = true;
        }
    };

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const routeLabel = req.matchedRoutePattern || req.originalUrl;
        const method = req.method;
        const statusCode = res.statusCode;

        // Record basic metrics
        httpRequestCounter.inc({
            method,
            route: routeLabel,
            service: service || 'unknown',
            status_code: statusCode
        });

        httpRequestDuration.observe({
            method,
            route: routeLabel,
            service: service || 'unknown',
            status_code: statusCode
        }, duration);

        // Track service routing
        if (service) {
            serviceRoutingCounter.inc({
                service,
                method
            });
        }

        // Track data transfer (approximate)
        const requestSize = req.get('content-length') || 0;
        const responseSize = res.get('content-length') || JSON.stringify(res.body || '').length;

        if (service) {
            dataTransferred.inc({
                direction: 'in',
                service
            }, parseInt(requestSize));

            dataTransferred.inc({
                direction: 'out',
                service
            }, parseInt(responseSize));
        }

        decrementConnection(); // Use the new function
    });

    res.on('close', () => {
        decrementConnection(); // Use the new function
    });

    next();
}

// Helper function to extract service from route
function getServiceFromRoute(routePattern) {
    if (!routePattern) return null;

    // Load routes config to match pattern to service
    try {
        const routes = require('../config/routes.json');
        const matchedRoute = routes.routes.find(route => route.path === routePattern);
        return matchedRoute ? matchedRoute.service : null;
    } catch (error) {
        return null;
    }
}

// Function to record rate limit exceeded
function recordRateLimitExceeded(route, service) {
    rateLimitCounter.inc({ route, service });
}

// Function to record auth attempts
function recordAuthAttempt(status, route) {
    authCounter.inc({ status, route });
}

// Function to record proxy errors
function recordProxyError(service, errorType) {
    proxyErrorCounter.inc({ service, error_type: errorType });
}

// Function to update service availability
function updateServiceAvailability(service, isAvailable) {
    serviceAvailability.set({ service }, isAvailable ? 1 : 0);
}

// Create metrics endpoint
function createMetricsEndpoint(app, path = '/metrics') {
    app.get(path, async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (err) {
            console.error('Error generating metrics:', err);
            res.status(500).end();
        }
    });
}

// Periodic service health check (optional)
function startServiceHealthCheck(services) {
    const http = require('http');

    setInterval(() => {
        Object.entries(services).forEach(([serviceName, serviceConfig]) => {
            // Use the healthCheck path from config instead of hardcoded /health
            const healthUrl = `${serviceConfig.url}${serviceConfig.healthCheck || '/health'}`;

            const req = http.get(healthUrl, (res) => {
                updateServiceAvailability(serviceName, res.statusCode === 200);
            });

            req.on('error', () => {
                updateServiceAvailability(serviceName, false);
            });

            req.setTimeout(5000, () => {
                req.destroy();
                updateServiceAvailability(serviceName, false);
            });
        });
    }, 30000); // Check every 30 seconds
}

module.exports = {
    register,
    metricsMiddleware,
    createMetricsEndpoint,
    recordRateLimitExceeded,
    recordAuthAttempt,
    recordProxyError,
    updateServiceAvailability,
    startServiceHealthCheck,
    // Export individual metrics for direct access if needed
    httpRequestCounter,
    httpRequestDuration,
    serviceAvailability,
    rateLimitCounter,
    activeConnections,
    proxyErrorCounter,
    dataTransferred,
    authCounter,
    serviceRoutingCounter
};