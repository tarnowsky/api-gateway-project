const userService = require('../services/userService');
const logger = require('../config/logger');

class UserController {
    async getProfile(req, res) {
        try {
            const user = await userService.getUserProfile(req.user.id);
            res.status(200).json(user);
        } catch (error) {
            logger.error(`Profile retrieval error: ${error.message}`);
            res.status(404).json({ message: error.message });
        }
    }
    
    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            res.status(200).json(users);
        } catch (error) {
            logger.error(`User listing error: ${error.message}`);
            res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new UserController();