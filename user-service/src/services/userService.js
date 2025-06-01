const { User } = require('../models');
const logger = require('../config/logger');

class UserService {
    async getUserProfile(userId) {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'email']
        });
        
        if (!user) {
            throw new Error('User not found');
        }
        
        return user;
    }
    
    async getAllUsers() {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email']
        });
        
        return users;
    }
    
    async getUserCount() {
        return await User.count();
    }
    
}

module.exports = new UserService();