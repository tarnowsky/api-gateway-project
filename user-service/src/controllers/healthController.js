const { register } = require('../config/metrics');

class HealthController {
    health(req, res) {
        res.status(200).json({
            status: 'UP',
            service: 'user-service',
        });
    }
    
    async metrics(req, res) {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    }
}

module.exports = new HealthController();