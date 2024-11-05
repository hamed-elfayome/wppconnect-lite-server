function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatPhoneNumber(number) {
    const numberStr = String(number);
    const cleanNumber = numberStr.replace(/\D/g, '');
    return cleanNumber.includes('@c.us') ? cleanNumber : `${cleanNumber}@c.us`;
}

function ensureDirectoryExists(directory) {
    const fs = require('fs');
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

module.exports = {
    wait,
    getRandomDelay,
    formatPhoneNumber,
    ensureDirectoryExists,
};