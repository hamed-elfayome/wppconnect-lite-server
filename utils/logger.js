const winston = require('winston');
const path = require('path');
const config = require('../config/default');

const logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
        }),
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
        }),
    ],
});

if (config.app.env !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

module.exports = logger;