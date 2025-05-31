const express = require('express');
const userController = require('../controllers/userController');
const { authenticationToken } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticationToken, userController.getProfile);
router.get('/', authenticationToken, userController.getAllUsers);

module.exports = router;