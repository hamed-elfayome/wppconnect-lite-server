const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/default');
const logger = require('./utils/logger');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { ensureDirectoryExists } = require('./utils/helpers');
const whatsappRoutes = require('./routes/whatsapp');

// Create required directories
ensureDirectoryExists('logs');
ensureDirectoryExists(config.storage.mediaDir);
ensureDirectoryExists(config.storage.sessionsDir);

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
app.use(rateLimiter);

// Routes
app.use('/api/whatsapp', whatsappRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(config.app.port, () => {
    logger.info(`Server running on port ${config.app.port}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', error);
    process.exit(1);
});

module.exports = app;