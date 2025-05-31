const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

// Validation middleware for user registration
const validateRegistration = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMsgs = errors.array().map(err => err.msg);
            logger.warn(`Registration validation failed: ${errorMsgs.join(', ')}`);
            return res.status(400).json({ message: 'Validation failed', errors: errorMsgs });
        }
        next();
    }
];

// Validation middleware for user login
const validateLogin = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required'),
    body('password')
        .notEmpty().withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMsgs = errors.array().map(err => err.msg);
            logger.warn(`Login validation failed: ${errorMsgs.join(', ')}`);
            return res.status(400).json({ message: 'Validation failed', errors: errorMsgs });
        }
        next();
    }
];

// General request body validation
const validateRequestBody = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: 'Request body is required' });
        }
    }
    next();
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateRequestBody
};
