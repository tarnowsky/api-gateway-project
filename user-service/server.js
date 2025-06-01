const app = require('./app');
const { connectDB } = require('./src/config/database');
const logger = require('./src/config/logger');

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();
        
        
        // Start server
        const PORT = process.env.PORT || 3001;
        app.listen(PORT, () => {
            logger.info(`User service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error(`Setup error: ${error.message}`);
        process.exit(1);
    }
};

startServer();