const authService = require('../services/authService');
const logger = require('../config/logger');

class AuthController {
    async register(req, res) {
        try {
            const result = await authService.register(req.body);
            
            
            res.status(201).json(result);
        } catch (error) {
            logger.error(`Registration error: ${error.message}`);
            res.status(400).json({ message: error.message });
        }
    }
    
    async login(req, res) {
        try {
            const result = await authService.login(req.body);
            
            
            res.status(200).json(result);
        } catch (error) {
            logger.error(`Login error: ${error.message}`);
            res.status(401).json({ message: error.message });
        }
    }
    
    async logout(req, res) {
        try {
            
            logger.info(`User logged out: ${req.user.username}`);
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (error) {
            logger.error(`Logout error: ${error.message}`);
            res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new AuthController();