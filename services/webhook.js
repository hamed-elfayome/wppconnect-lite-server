const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/default');
const logger = require('../utils/logger');

async function sendStatus(status) {
    try {
        await axios.post(`${config.api.laravelEndpoint}`, { status });
        logger.info('Status sent successfully', { status });
    } catch (error) {
        logger.error('Error sending status:', error);
    }
}

async function sendQRCode(qrCode) {
    try {
        await axios.post(`${config.api.laravelEndpoint}`, { qrCode });
        logger.info('QR Code sent successfully');
    } catch (error) {
        logger.error('Error sending QR Code:', error);
    }
}

async function forwardMessageToBackend(message, client) {
    try {
        const messageData = {
            from: message.from,
            sender: {
                id: message.sender?.id || message.from,
                name: message.sender?.name || 'Unknown',
                pushname: message.sender?.pushname || 'Unknown'
            },
            body: message.body,
            type: message.type,
            timestamp: message.timestamp,
            isGroupMsg: message.isGroupMsg,
            messageId: message.id,
            quotedMsg: message.quotedMsg || null,
            mentionedJidList: message.mentionedJidList || []
        };

        if (message.hasMedia || ['ptt', 'audio', 'image', 'video', 'document', 'sticker'].includes(message.type)) {
            try {
                const mediaInfo = await handleMediaMessage(message, client);
                messageData.mediaInfo = mediaInfo;
            } catch (error) {
                logger.error(`Error processing ${message.type} message:`, error);
                messageData.mediaError = error.message;
            }
        }

        if (message.type === 'location') {
            messageData.location = {
                latitude: message.lat,
                longitude: message.lng,
                description: message.loc
            };
        }

        if (message.type === 'vcard') {
            messageData.contact = {
                vcardData: message.body,
                displayName: message.vcardFormattedName
            };
        }

        await axios.post(`${config.api.laravelEndpoint}`, messageData);
        logger.info('Message forwarded to backend successfully', { messageId: message.id });
    } catch (error) {
        logger.error('Error forwarding message to backend:', error);
        throw error;
    }
}

async function handleMediaMessage(message, client) {
    try {
        const mediaInfo = {
            type: message.type,
            mimetype: message.mimetype || '',
            duration: message.duration || null,
            filename: `${message.id}`,
            caption: message.caption || '',
            size: message.size || 0
        };

        const buffer = await client.downloadMedia(message);

        if (!buffer) {
            throw new Error('Failed to download media');
        }

        switch (message.type) {
            case 'ptt':
            case 'audio':
                mediaInfo.waveform = message.waveform || null;
                mediaInfo.seconds = message.duration || 0;
                break;

            case 'image':
                mediaInfo.width = message.width || 0;
                mediaInfo.height = message.height || 0;
                break;

            case 'video':
                mediaInfo.width = message.width || 0;
                mediaInfo.height = message.height || 0;
                mediaInfo.seconds = message.duration || 0;
                mediaInfo.thumbnail = message.thumbnail || null;
                break;

            case 'document':
                mediaInfo.pageCount = message.pageCount || null;
                break;
        }

        const formData = new FormData();
        formData.append('file', buffer, {
            filename: mediaInfo.filename,
            contentType: message.mimetype || 'application/octet-stream'
        });
        formData.append('mediaInfo', JSON.stringify(mediaInfo));

        await axios.post(`${config.api.laravelEndpoint}`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        return mediaInfo;
    } catch (error) {
        logger.error('Error handling media message:', error);
        throw error;
    }
}

module.exports = {
    sendStatus,
    sendQRCode,
    forwardMessageToBackend,
};