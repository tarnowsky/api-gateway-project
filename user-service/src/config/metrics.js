const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
    name: 'userservice_http_requests_total', 
    help: 'Total number of requests', 
    labelNames: ['method', 'route', 'status_code'], 
    registers: [register] 
});

const userRegistrationCounter = new client.Counter({
    name: 'userservice_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['status'],
    registers: [register]
});

const userLoginCounter = new client.Counter({
    name: 'userservice_logins_total',
    help: 'Total number of user logins',
    labelNames: ['status'],
    registers: [register]
});

const totalUsersGauge = new client.Gauge({
    name: 'userservice_total_users',
    help: 'Total number of registered users',
    registers: [register]
});

const activeUsersGauge = new client.Gauge({
    name: 'userservice_active_users',
    help: 'Number of currently active users',
    registers: [register]
});

const uniqueRequestsGauge = new client.Gauge({
    name: 'userservice_unique_requests',
    help: 'Unique request endpoints and their total counts',
    labelNames: ['method', 'route'],
    registers: [register]
});

const userInfoGauge = new client.Gauge({
    name: 'userservice_users_info',
    help: 'User information for dashboard display',
    labelNames: ['a_id', 'b_login', 'c_email'],
    registers: [register]
});

module.exports = {
    register,
    httpRequestCounter,
    userRegistrationCounter,
    userLoginCounter,
    totalUsersGauge,
    activeUsersGauge,
    uniqueRequestsGauge,
    userInfoGauge
};