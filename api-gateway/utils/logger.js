const winston = require('winston');
const { createLogger } = require('/shared/logger');

const instanceId = process.env.INSTANCE_ID || '1';
const logger = createLogger(winston, `api-gateway-${instanceId}`);

module.exports = logger;