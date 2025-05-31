const jwt = require('jsonwebtoken');
const metricsService = require('../services/metricsService');

const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        
        // Track active session
        metricsService.addActiveSession(user.id);
        
        next();
    });
};

module.exports = { authenticationToken };