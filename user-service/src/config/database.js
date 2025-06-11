const { Sequelize } = require('sequelize');
const logger = require('./logger');



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

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        await sequelize.sync();
        logger.info('Database synchronized');
    } catch (error) {
        logger.error('Unable to connect to database:', error);
        process.exit(1);
    }
};

module.exports = { sequelize, connectDB };