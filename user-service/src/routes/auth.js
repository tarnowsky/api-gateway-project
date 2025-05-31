const express = require('express');
const authController = require('../controllers/authController');
const { authenticationToken } = require('../middleware/auth');
const { 
    validateRegistration, 
    validateLogin, 
    sanitizeInput 
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', 
    sanitizeInput, 
    validateRegistration, 
    authController.register
);

router.post('/login', 
    sanitizeInput, 
    validateLogin, 
    authController.login
);

router.post('/logout', 
    authenticationToken, 
    authController.logout
);

module.exports = router;