const path = require("path");
const fs = require("fs");

const logDir = path.join(__dirname, '../../logs');
const errorDir = path.join(__dirname, '../../errors');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

if (!fs.existsSync(errorDir)) {
    fs.mkdirSync(errorDir, { recursive: true });
}

function logInfo(message, requestId, step) {
    const logFilePath = path.join(logDir, `info_${requestId}.log`);
    const logMessage = `[${new Date().toISOString()}] [${step}] ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
}

function logError(message, requestId, step) {
    const errorFilePath = path.join(errorDir, `error_${requestId}.log`);
    const errorMessage = `[${new Date().toISOString()}] [${step}] ${message}\n`;
    fs.appendFileSync(errorFilePath, errorMessage);
}

module.exports = {
    logInfo,
    logError
};
