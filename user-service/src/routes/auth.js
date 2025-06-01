const express = require('express');
const authController = require('../controllers/authController');
const { authenticationToken } = require('../middleware/auth');
const { 
    validateRegistration, 
    validateLogin, 
    validateRequestBody 
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', 
    validateRequestBody, 
    validateRegistration, 
    authController.register
);

router.post('/login', 
    validateRequestBody, 
    validateLogin, 
    authController.login
);

router.post('/logout', 
    authenticationToken, 
    authController.logout
);

module.exports = router;