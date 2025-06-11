const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

class AuthService {
    async register(userData) {
        const { username, email, password } = userData;
    
    try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });
        
        logger.info(`User registered: ${username}`);
        return {
            message: 'User registered successfully',
            userId: user.id,
        };
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0].path; // 'username' lub 'email'
            throw new Error(`${field} already exists`);
        }
        throw error;
    }
    }
    
    async login(credentials) {
        const { username, password } = credentials;
        
        // Find user
        const user = await User.findOne({ where: { username } });
        if (!user) {
            throw new Error('Invalid username or password');
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            throw new Error('Invalid username or password');
        }
        
        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '2h' }
        );
        
        logger.info(`User logged in: ${user.username}`);
        return { token };
    }
}

module.exports = new AuthService();