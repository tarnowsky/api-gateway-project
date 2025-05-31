const {
    totalUsersGauge,
    activeUsersGauge,
    uniqueRequestsGauge,
    userInfoGauge
} = require('../config/metrics');
const userService = require('./userService');
const logger = require('../config/logger');

class MetricsService {
    constructor() {
        this.activeSessions = new Set();
        this.uniqueRequests = new Map();
    }
    
    async updateTotalUsersGauge() {
        try {
            const count = await userService.getUserCount();
            totalUsersGauge.set(count);
        } catch (error) {
            logger.error(`Error updating total users gauge: ${error.message}`);
        }
    }
    
    async updateUserInfoMetrics() {
        try {
            const users = await userService.getUsersForMetrics();
            
            userInfoGauge.reset();
            
            users.forEach(user => {
                userInfoGauge.set({ 
                    a_id: user.id.toString(), 
                    b_login: user.username, 
                    c_email: user.email 
                }, 1);
            });
        } catch (error) {
            logger.error(`Error updating user info metrics: ${error.message}`);
        }
    }
    
    updateActiveUsersGauge() {
        activeUsersGauge.set(this.activeSessions.size);
    }
    
    addActiveSession(userId) {
        this.activeSessions.add(userId);
        this.updateActiveUsersGauge();
    }
    
    removeActiveSession(userId) {
        this.activeSessions.delete(userId);
        this.updateActiveUsersGauge();
    }
    
    updateUniqueRequestsGauge() {
        uniqueRequestsGauge.reset();
        for (const [routeKey, count] of this.uniqueRequests.entries()) {
            const [method, route] = routeKey.split(' ', 2);
            uniqueRequestsGauge.set({ method, route }, count);
        }
    }
    
    incrementUniqueRequest(method, path) {
        const routeKey = `${method} ${path}`;
        const currentCount = this.uniqueRequests.get(routeKey) || 0;
        this.uniqueRequests.set(routeKey, currentCount + 1);
        this.updateUniqueRequestsGauge();
    }
}

module.exports = new MetricsService();