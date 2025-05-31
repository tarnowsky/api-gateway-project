const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const healthRoutes = require('./health');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.use('/users', authRoutes);
router.use('/users', userRoutes);
router.use('/users', healthRoutes);
router.get('/metrics', healthController.metrics);

module.exports = router;