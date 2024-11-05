const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const { validateApiKey } = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply API key validation to all routes
router.use(validateApiKey);

router.post('/initialize', async (req, res, next) => {
    try {
        // Start the initialization process in the background
        whatsappService.initializeWhatsApp()
            .catch(error => logger.error('Background initialization failed:', error));

        return res.json({
            success: true,
            message: 'Initialization started'
        });
    } catch (error) {
        next(error);
    }
});

router.get('/session-status', async (req, res, next) => {
    try {
        const status = await whatsappService.getSessionStatus();
        res.json(status);
    } catch (error) {
        next(error);
    }
});

router.post('/send-message', async (req, res, next) => {
    try {
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                message: 'Both number and message are required'
            });
        }

        const result = await whatsappService.sendMessage(number, message);
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
});

router.post('/disconnect', async (req, res, next) => {
    try {
        const result = await whatsappService.disconnect();
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
});

router.post('/delete', async (req, res, next) => {
    try {
        const result = await whatsappService.deleteSession();
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;