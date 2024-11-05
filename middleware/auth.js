const config = require('../config/default');
const logger = require('../utils/logger');

function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== config.api.secretKey) {
        logger.warn('Invalid API key attempt', {
            ip: req.ip,
            path: req.path,
        });
        return res.status(401).json({
            success: false,
            message: 'Invalid API key',
        });
    }

    next();
}

module.exports = {
    validateApiKey,
};