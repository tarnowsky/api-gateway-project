const { httpRequestCounter } = require('../config/metrics');
const metricsService = require('../services/metricsService');

const metricsMiddleware = (req, res, next) => {
    res.on('finish', () => {
        metricsService.incrementUniqueRequest(req.method, req.path);
        httpRequestCounter.inc({ 
            method: req.method, 
            route: req.path, 
            status_code: res.statusCode 
        });
    });
    next();
};

module.exports = { metricsMiddleware };