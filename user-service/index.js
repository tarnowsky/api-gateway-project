const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const winston = require('winston');
const client = require('prom-client');

//? Load envionment variables
dotenv.config();

//? Setup logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ]
});

//? Initialize Express app
const app = express();

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
    name: 'userservice_http_requests_total', 
    help: 'Total number of requests', 
    labelNames: ['method', 'route', 'status_code'], 
    registers: [register] 
});

// Updated registration counter to match dashboard expectations
const userRegistrationCounter = new client.Counter({
    name: 'userservice_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['status'],
    registers: [register]
});

// New: Login counter for dashboard
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

// New: Active users gauge for dashboard
const activeUsersGauge = new client.Gauge({
    name: 'userservice_active_users',
    help: 'Number of currently active users',
    registers: [register]
});

// New: Unique request summary gauge for dashboard table
const uniqueRequestsGauge = new client.Gauge({
    name: 'userservice_unique_requests',
    help: 'Unique request endpoints and their total counts',
    labelNames: ['method', 'route'],
    registers: [register]
});

// New: User info metric for dashboard table - using constant value 1 for each unique user
const userInfoGauge = new client.Gauge({
    name: 'userservice_users_info',
    help: 'User information for dashboard display',
    labelNames: ['a_id', 'b_login', 'c_email'],
    registers: [register]
});

// Track active sessions and unique requests
const activeSessions = new Set();
const uniqueRequests = new Map(); // Track unique method+route combinations

function updateUniqueRequestsGauge() {
    uniqueRequestsGauge.reset();
    for (const [routeKey, count] of uniqueRequests.entries()) {
        const [method, route] = routeKey.split(' ', 2);
        uniqueRequestsGauge.set({ method, route }, count);
    }
}

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    res.on('finish', () => {
        const routeKey = `${req.method} ${req.path}`;
        const currentCount = uniqueRequests.get(routeKey) || 0;
        uniqueRequests.set(routeKey, currentCount + 1);
        
        // Update the gauge for dashboard display
        updateUniqueRequestsGauge();
        
        httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    });
    next();
});

//? Database connection
const sequelize = new Sequelize(
    process.env.DB_NAME || 'userdb',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'user-db',
        dialect: 'postgres',
        logging: false,
    }
);

//? Define User model
const User = sequelize.define('User', {
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

async function updateTotalUsersGauge() {
    try {
        const count = await User.count();
        totalUsersGauge.set(count);
    } catch (error) {
        logger.error(`Error updating total users gauge: ${error.message}`);
    }
}

async function updateUserInfoMetrics() {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email'],
            limit: 100 // Limit to prevent too many metrics
        });
        
        // Clear existing user info metrics
        userInfoGauge.reset();
        
        // Set metrics for each user with value 1 (just to show they exist)
        users.forEach(user => {
            userInfoGauge.set({ a_id: user.id.toString(), b_login: user.username, c_email: user.email }, 1);
        });
    } catch (error) {
        logger.error(`Error updating user info metrics: ${error.message}`);
    }
}

function updateActiveUsersGauge() {
    activeUsersGauge.set(activeSessions.size);
}

//? Middleware to authenticate token
const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        
        // Track active session
        activeSessions.add(user.id);
        updateActiveUsersGauge();
        
        next();
    });
}

//? Health check endpoint
app.get('/users/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        service: 'user-service',
    });
});

//? Register new user
app.post('/users/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        //? Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        // Increment success counter and update gauges
        userRegistrationCounter.inc({ status: 'success' });
        await updateTotalUsersGauge();
        await updateUserInfoMetrics();

        logger.info(`User registered ${username}`);
        res.status(201).json({
            message: 'User registered successfully',
            userId: user.id,
        })
    } catch (error) {
        // Increment failure counter
        userRegistrationCounter.inc({ status: 'failed' });
        
        logger.error(`Registration error: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

//? Login user
app.post('/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        //? Find user
        const user = await User.findOne({ where: { username } });
        if (!user) {
            userLoginCounter.inc({ status: 'failed' });
            return res.status(401).json({ message: 'Invalid username or password ' });
        }

        //? Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            userLoginCounter.inc({ status: 'failed' });
            return res.status(401).json({ message: 'Invalid username or password ' });
        }

        //? Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '2h' },
        );

        // Increment success counter and track active session
        userLoginCounter.inc({ status: 'success' });
        activeSessions.add(user.id);
        updateActiveUsersGauge();

        logger.info(`User logged in: ${user.username}`);
        res.status(200).json({ token });

    } catch (error) {
        userLoginCounter.inc({ status: 'failed' });
        logger.error(`Login error: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

//? Logout endpoint (optional - to properly track active users)
app.post('/users/logout', authenticationToken, (req, res) => {
    try {
        // Remove from active sessions
        activeSessions.delete(req.user.id);
        updateActiveUsersGauge();
        
        logger.info(`User logged out: ${req.user.username}`);
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error(`Logout error: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

//? Get user profile
app.get('/users/profile', authenticationToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'email']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        logger.error(`Profile retrieval error: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

//? Get all users (admin endpoint)
app.get('/users', authenticationToken, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email']
        });

        res.status(200).json(users);
    } catch (error) {
        logger.error(`User listing error: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Clean up inactive sessions periodically
setInterval(() => {
    // This is a simple cleanup - in production you'd want more sophisticated session management
    // For now, we'll just keep sessions active for demonstration
}, 300000); // 5 minutes

//? Initialize database and start server
(async () => {
    try {
        await sequelize.sync();
        logger.info('Database synchronized');

        await updateTotalUsersGauge();
        await updateUserInfoMetrics();
        logger.info('Metrics initialized');

        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            logger.info(`User service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(`Setup error: ${error.message}`);
        process.exit(1);
    }
})();

module.exports = app; //? Export for testing