require('dotenv').config();

module.exports = {
    app: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
    },
    api: {
        secretKey: process.env.API_SECRET_KEY,
        laravelEndpoint: process.env.WEB_HOOK_URL,
    },
    whatsapp: {
        sessionName: process.env.SESSION_NAME || 'my-session',
    },
    storage: {
        mediaDir: process.env.MEDIA_DIR || 'storage/media',
        sessionsDir: process.env.SESSIONS_DIR || 'storage/sessions',
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },
};