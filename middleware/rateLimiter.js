const rateLimit = require('express-rate-limit');
const config = require('../config/default');

const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
});

module.exports = limiter;