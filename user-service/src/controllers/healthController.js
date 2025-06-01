class HealthController {
    health(req, res) {
        res.status(200).json({
            status: 'UP',
            service: 'user-service',
        });
    }
}

module.exports = new HealthController();