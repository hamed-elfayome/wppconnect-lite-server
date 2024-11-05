const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    res.status(err.status || 500).json({
        success: false,
        message: config.app.env === 'production'
            ? 'Internal server error'
            : err.message,
    });
}

module.exports = errorHandler;