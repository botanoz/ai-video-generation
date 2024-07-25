const fs = require("fs");
const path = require("path");
const { logInfo, logError } = require('./logUtils');

const tempDir = path.join(__dirname, '../../temp_files');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

function createUniqueId() {
    return require('uuid').v4();
}

function cleanTempFiles(requestId) {
    try {
        logInfo(`Cleaning temporary files for request ${requestId}...`, requestId, 'cleanTempFiles');
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        logError(`Error cleaning temporary files for request ${requestId}: ${error}`, requestId, 'cleanTempFiles');
    }
}

module.exports = {
    createUniqueId,
    cleanTempFiles
};
