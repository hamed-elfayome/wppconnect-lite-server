const wppconnect = require('@wppconnect-team/wppconnect');
const config = require('../config/default');
const logger = require('../utils/logger');
const { wait, getRandomDelay, formatPhoneNumber } = require('../utils/helpers');
const webhookService = require('./webhook');
const SessionStorage = require('./sessionStorage');
const fs = require('fs').promises;
const path = require('path');

let client = null;
let qrCodeData = null;
let sessionStatus = 'disconnected';
const sessionStorage = new SessionStorage(config.storage.sessionsDir);

async function initializeWhatsApp() {
    try {
        await sessionStorage.initialize();

        // Check if there's an existing session
        const savedSession = await sessionStorage.getSession(config.whatsapp.sessionName);
        if (savedSession && savedSession.status === 'connected') {
            sessionStatus = 'restoring';
            logger.info('Restoring previous session');
        }

        if (client) {
            return {
                success: false,
                message: 'Session already exists',
                status: sessionStatus,
                qrCode: qrCodeData
            };
        }

        qrCodeData = null;
        sessionStatus = 'initializing';

        client = await wppconnect.create({
            session: config.whatsapp.sessionName,
            catchQR: async (base64Qr, asciiQR, attempts, urlCode) => {
                logger.info('QR Code received', { attempts });
                qrCodeData = base64Qr;
                sessionStatus = 'qr_ready';
                await sessionStorage.updateSession(config.whatsapp.sessionName, {
                    status: sessionStatus,
                    qrCode: base64Qr,
                    attempts
                });
                await webhookService.sendQRCode(base64Qr);
            },
            statusFind: async (statusSession, session) => {
                logger.info('Status Session:', { status: statusSession, session });

                if (statusSession === 'inChat' || statusSession === 'connected') {
                    sessionStatus = 'connected';
                    qrCodeData = null;
                } else if (statusSession === 'notLogged') {
                    sessionStatus = 'disconnected';
                }

                await sessionStorage.updateSession(config.whatsapp.sessionName, {
                    status: sessionStatus,
                    qrCode: qrCodeData,
                    whatsappStatus: statusSession
                });
            },
        });

        setupMessageListener(client);

        // Save initial session state
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            status: sessionStatus,
            qrCode: qrCodeData,
            initialized: true,
            lastInitialized: new Date().toISOString()
        });

        return {
            success: true,
            message: 'WhatsApp client initialized',
            status: sessionStatus,
            qrCode: qrCodeData
        };
    } catch (error) {
        logger.error('Error creating WhatsApp client:', error);
        sessionStatus = 'error';
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            status: sessionStatus,
            error: error.message,
            errorTimestamp: new Date().toISOString()
        });
        return {
            success: false,
            message: error.message,
            status: sessionStatus,
            qrCode: null
        };
    }
}

function setupMessageListener(client) {
    client.onMessage(async (message) => {
        try {
            logger.info('New message received:', { messageId: message.id });
            await webhookService.forwardMessageToBackend(message, client);

            // Update session storage with last message info
            await sessionStorage.updateSession(config.whatsapp.sessionName, {
                lastMessageReceived: new Date().toISOString(),
                lastMessageId: message.id
            });
        } catch (error) {
            logger.error('Error forwarding message to backend:', error);
        }
    });

    client.onStateChange(async (state) => {
        logger.info('WhatsApp state changed:', { state });

        if (state === 'CONNECTED') {
            sessionStatus = 'connected';
            qrCodeData = null;
            await sessionStorage.updateSession(config.whatsapp.sessionName, {
                status: sessionStatus,
                qrCode: null,
                lastConnected: new Date().toISOString()
            });
            await webhookService.sendStatus('connected');
        } else if (state === 'DISCONNECTED') {
            sessionStatus = 'disconnected';
            await sessionStorage.updateSession(config.whatsapp.sessionName, {
                status: sessionStatus,
                lastDisconnected: new Date().toISOString()
            });
            await webhookService.sendStatus('disconnected');
        }
    });
}

async function sendMessage(number, message) {
    if (!client || !client.isConnected()) {
        throw new Error('WhatsApp client is not connected');
    }

    try {
        const formattedNumber = formatPhoneNumber(number);
        logger.info(`Attempting to send message to: ${formattedNumber}`);

        const numberStatus = await client.checkNumberStatus(formattedNumber);

        if (!numberStatus.numberExists) {
            await sessionStorage.updateSession(config.whatsapp.sessionName, {
                lastFailedMessage: {
                    number,
                    reason: 'number_not_registered',
                    timestamp: new Date().toISOString()
                }
            });

            return {
                success: false,
                message: `Number ${number} is not registered on WhatsApp`
            };
        }

        const result = await client.sendText(formattedNumber, String(message));
        await wait(getRandomDelay(2000, 5000));

        // Update session storage with message success
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            lastMessageSent: {
                number: formattedNumber,
                messageId: result.id,
                timestamp: new Date().toISOString()
            }
        });

        return {
            success: true,
            message: `Message sent successfully to ${number}`,
            messageId: result.id
        };
    } catch (error) {
        logger.error(`Failed to send message to ${number}:`, error);

        // Update session storage with message failure
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            lastFailedMessage: {
                number,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });

        return {
            success: false,
            message: `Error sending message: ${error.message}`
        };
    }
}

async function getSessionStatus() {
    if (!client) {
        const savedSession = await sessionStorage.getSession(config.whatsapp.sessionName);
        return {
            success: true,
            status: 'no_session',
            message: 'No WhatsApp session exists',
            qrCode: null,
            lastSessionData: savedSession
        };
    }

    try {
        const isConnected = await client.isConnected();
        const currentStatus = isConnected ? 'connected' : sessionStatus;

        // Update session storage with current status
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            status: currentStatus,
            qrCode: qrCodeData,
            lastStatusCheck: new Date().toISOString()
        });

        return {
            success: true,
            status: currentStatus,
            message: isConnected ? 'Session is active and connected' : 'Session exists but not connected',
            qrCode: qrCodeData
        };
    } catch (error) {
        logger.error('Error getting session status:', error);

        // Update session storage with error
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            status: 'error',
            lastError: error.message,
            errorTimestamp: new Date().toISOString()
        });

        return {
            success: false,
            status: 'error',
            message: error.message,
            qrCode: null
        };
    }
}

async function disconnect() {
    if (!client) {
        return {
            success: false,
            message: 'No active session to disconnect',
            status: 'no_session',
            qrCode: null
        };
    }

    try {
        await client.close();
        client = null;
        qrCodeData = null;
        sessionStatus = 'disconnected';

        // Update session storage with disconnection
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            status: sessionStatus,
            qrCode: null,
            lastDisconnected: new Date().toISOString(),
            disconnectionReason: 'manual_disconnect'
        });

        await webhookService.sendStatus('disconnected');

        return {
            success: true,
            message: 'Session disconnected successfully',
            status: 'disconnected',
            qrCode: null
        };
    } catch (error) {
        logger.error('Error disconnecting session:', error);

        // Update session storage with error
        await sessionStorage.updateSession(config.whatsapp.sessionName, {
            status: 'error',
            lastError: error.message,
            errorTimestamp: new Date().toISOString()
        });

        return {
            success: false,
            message: error.message,
            status: 'error',
            qrCode: null
        };
    }
}

async function deleteSession() {
    try {
        // First disconnect if there's an active session
        if (client) {
            try {
                await client.close();
                client = null;
                qrCodeData = null;
                sessionStatus = 'disconnected';
                await webhookService.sendStatus('disconnected');
            } catch (error) {
                logger.error('Error closing client during session deletion:', error);
                // Continue with deletion even if disconnect fails
            }
        }

        // Delete the session from storage
        await sessionStorage.removeSession(config.whatsapp.sessionName);

        // Delete the token directory
        const tokenPath = path.join(process.cwd(), 'tokens', config.whatsapp.sessionName);
        try {
            await fs.rm(tokenPath, { recursive: true, force: true });
            logger.info(`Token directory deleted: ${tokenPath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') { // Ignore if directory doesn't exist
                logger.error(error);
            }
        }

        // Delete the session files in wppconnect-sessions
        const sessionPath = path.join(process.cwd(), 'tokens', `${config.whatsapp.sessionName}.data.json`);
        try {
            await fs.unlink(sessionPath);
            logger.info(`Session file deleted: ${sessionPath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') { // Ignore if file doesn't exist
                logger.error(error);
            }
        }

        return {
            success: true,
            message: 'Session deleted successfully',
            status: 'deleted'
        };
    } catch (error) {
        logger.error('Error deleting session:', error);
        return {
            success: false,
            message: `Error deleting session: ${error.message}`,
            status: 'error'
        };
    }
}


module.exports = {
    initializeWhatsApp,
    sendMessage,
    getSessionStatus,
    disconnect,
    deleteSession,
};