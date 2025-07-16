const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

const logger = {
  info: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}\n`;
    logStream.write(logMessage);
    console.log(logMessage.trim());
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}\n`;
    logStream.write(logMessage);
    console.error(logMessage.trim());
  },
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
};

module.exports = logger;
