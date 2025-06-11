const winston = require('winston');
const { createLogger } = require('/shared/logger');

module.exports = createLogger(winston, 'user-service');