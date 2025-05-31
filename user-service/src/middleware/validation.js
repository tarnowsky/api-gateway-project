const logger = require('../config/logger');

// Validation middleware for user registration
const validateRegistration = (req, res, next) => {
    const { username, email, password } = req.body;
    const errors = [];

    // Username validation
    if (!username || username.trim().length === 0) {
        errors.push('Username is required');
    } else if (username.length < 3) {
        errors.push('Username must be at least 3 characters long');
    } else if (username.length > 50) {
        errors.push('Username must be less than 50 characters');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Email validation
    if (!email || email.trim().length === 0) {
        errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please provide a valid email address');
    }

    // Password validation
    if (!password || password.length === 0) {
        errors.push('Password is required');
    } else if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    } else if (password.length > 128) {
        errors.push('Password must be less than 128 characters');
    }

    if (errors.length > 0) {
        logger.warn(`Registration validation failed: ${errors.join(', ')}`);
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors 
        });
    }

    next();
};

// Validation middleware for user login
const validateLogin = (req, res, next) => {
    const { username, password } = req.body;
    const errors = [];

    if (!username || username.trim().length === 0) {
        errors.push('Username is required');
    }

    if (!password || password.length === 0) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        logger.warn(`Login validation failed: ${errors.join(', ')}`);
        return res.status(400).json({ 
            message: 'Validation failed', 
            errors 
        });
    }

    next();
};

// General request body validation
const validateRequestBody = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ 
                message: 'Request body is required' 
            });
        }
    }
    next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        // Trim string values and remove potential XSS
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
                // Basic XSS prevention - remove script tags
                req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            }
        });
    }
    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateRequestBody,
    sanitizeInput
};