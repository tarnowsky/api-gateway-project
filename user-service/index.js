const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const winston = require('winston');
const { use } = require('react');

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
app.use(express.json());
app.use(cors());

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

//? Middleware to authenticate token
const authenticationToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token'});
        }
        req.user = user;
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
app.post('/user/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        //? Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = User.create({
            username, 
            email,
            password: hashedPassword,
        });

        logger.info(`User registered ${username}`);
        res.status(201).json({
            message: 'User registered successfully',
            userId: user.id,
        })
    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

//? Login user
app.post('/user/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        //? Find user
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Invaid username or password '});
        }

        //? Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invaid username or password '});
        }

        //? Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '2h' },
        );

        logger.info(`User logged in: ${user.username}`);
        res.status(200).json({ token });
        
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

//? Get user profile
app.get('users/profile', authenticationToken, async (req, res) => {
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

//? Initialize database and start server
(async () => {
    try {
        await sequelize.sync();
        logger.info('Database synchronized');

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