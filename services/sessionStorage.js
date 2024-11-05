const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class SessionStorage {
    constructor(sessionsDir) {
        this.sessionsDir = sessionsDir;
        this.sessionFile = path.join(sessionsDir, 'whatsapp-sessions.json');
        this.sessions = {};
    }

    async initialize() {
        try {
            await fs.access(this.sessionFile);
            const data = await fs.readFile(this.sessionFile, 'utf8');
            this.sessions = JSON.parse(data);
            logger.info('Session storage loaded successfully');
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, create empty storage
                await this.saveSessions();
                logger.info('Created new session storage file');
            } else {
                logger.error('Error initializing session storage:', error);
                throw error;
            }
        }
    }

    async saveSessions() {
        try {
            await fs.writeFile(
              this.sessionFile,
              JSON.stringify(this.sessions, null, 2),
              'utf8'
            );
            logger.info('Sessions saved successfully');
        } catch (error) {
            logger.error('Error saving sessions:', error);
            throw error;
        }
    }

    async updateSession(sessionName, data) {
        this.sessions[sessionName] = {
            ...this.sessions[sessionName],
            ...data,
            lastUpdated: new Date().toISOString()
        };
        await this.saveSessions();
    }

    async getSession(sessionName) {
        return this.sessions[sessionName] || null;
    }

    async removeSession(sessionName) {
        if (this.sessions[sessionName]) {
            // Store deletion record before removing
            const deletionRecord = {
                sessionName,
                deletedAt: new Date().toISOString(),
                lastStatus: this.sessions[sessionName].status
            };

            // Remove the session
            delete this.sessions[sessionName];

            // Add to deletion history
            if (!this.sessions._deletionHistory) {
                this.sessions._deletionHistory = [];
            }
            this.sessions._deletionHistory.push(deletionRecord);

            // Keep only last 10 deletion records
            if (this.sessions._deletionHistory.length > 10) {
                this.sessions._deletionHistory.shift();
            }

            await this.saveSessions();
            logger.info(`Session ${sessionName} removed from storage`);
        }
    }

    async getAllSessions() {
        return this.sessions;
    }

    async getDeletionHistory() {
        return this.sessions._deletionHistory || [];
    }
}

module.exports = SessionStorage;