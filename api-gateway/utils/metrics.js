const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// HTTP request counter - only metric needed for current dashboard
const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'job', 'instance'],
    registers: [register]
});

// Middleware for HTTP metrics
function metricsMiddleware(req, res, next) {
    res.on('finish', () => {
        const routeLabel = req.matchedRoutePattern || (req.route ? req.route.path : req.originalUrl);
        const method = req.method;
        
        // Labels required by dashboard query
        const labels = { 
            method, 
            route: routeLabel,
            job: 'api-gateway',
            instance: process.env.INSTANCE_NAME || `${require('os').hostname()}:${process.env.PORT || 3000}`
        };

        httpRequestCounter.inc(labels);
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
    createMetricsEndpoint,
    httpRequestCounter
};