const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Existing request duration histogram
const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register]
});

// Existing HTTP request counter - updated to match dashboard expectations
const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'job', 'instance'],
    registers: [register]
});

// Unique request summary gauge for dashboard table
const uniqueRequestsGauge = new client.Gauge({
    name: 'api_gateway_unique_requests',
    help: 'Unique request endpoints and their total counts',
    labelNames: ['method', 'route'],
    registers: [register]
});

// Track unique requests to avoid duplicates in dashboard
const uniqueRequests = new Map();

function updateUniqueRequestsGauge() {
    uniqueRequestsGauge.reset();
    for (const [routeKey, count] of uniqueRequests.entries()) {
        const [method, route] = routeKey.split(' ', 2);
        uniqueRequestsGauge.set({ method, route }, count);
    }
}

// New: Registration-specific metrics at gateway level
const registrationRequestCounter = new client.Counter({
    name: 'api_gateway_registration_requests_total',
    help: 'Total registration requests through API Gateway',
    labelNames: ['status_code', 'upstream_service'],
    registers: [register]
});

const registrationDuration = new client.Histogram({
    name: 'api_gateway_registration_duration_seconds',
    help: 'Duration of registration requests through API Gateway',
    labelNames: ['status_code', 'upstream_service'],
    buckets: [0.5, 1, 2, 5, 10],
    registers: [register]
});

// Middleware for general HTTP metrics
function metricsMiddleware(req, res, next) {
    const end = httpDuration.startTimer();

    res.on('finish', () => {
        const routeLabel = req.matchedRoutePattern || (req.route ? req.route.path : req.originalUrl);
        const method = req.method;
        const statusCode = res.statusCode;
        
        // Track unique requests
        const routeKey = `${method} ${routeLabel}`;
        const currentCount = uniqueRequests.get(routeKey) || 0;
        uniqueRequests.set(routeKey, currentCount + 1);
        
        // Update gauge for dashboard table
        updateUniqueRequestsGauge();
        
        // Add job and instance labels for dashboard compatibility
        const labels = { 
            method, 
            route: routeLabel, 
            status_code: statusCode,
            job: 'api-gateway',
            instance: process.env.INSTANCE_NAME || `${require('os').hostname()}:${process.env.PORT || 3000}`
        };

        end({ method, route: routeLabel, status_code: statusCode });
        httpRequestCounter.inc(labels);
    });

    next();
}

// Middleware specifically for registration requests
function registrationMetricsMiddleware(req, res, next) {
    const isRegistrationRoute = req.originalUrl.includes('/register') || req.originalUrl.includes('/signup');
    
    if (!isRegistrationRoute) {
        return next();
    }

    const end = registrationDuration.startTimer();

    res.on('finish', () => {
        const statusCode = res.statusCode;
        const upstreamService = 'user-service'; // or dynamically determine this
        
        end({ status_code: statusCode, upstream_service: upstreamService });
        registrationRequestCounter.inc({ status_code: statusCode, upstream_service: upstreamService });
    });

    next();
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

module.exports = {
    register,
    metricsMiddleware,
    registrationMetricsMiddleware,
    createMetricsEndpoint,
    httpDuration,
    httpRequestCounter,
    registrationRequestCounter,
    registrationDuration
};