const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'app.log');

function formatTime() {
  return new Date().toISOString();
}

function writeToFile(level, message, data = null) {
  try {
    const logLine = `[${formatTime()}] [${level.toUpperCase()}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    fs.appendFileSync(logFile, logLine);
  } catch (err) {
    console.error('Failed to write log to file:', err.message);
  }
}

const logger = {
  info: (message, data = null) => {
    console.log(`\x1b[36m[INFO]\x1b[0m [${formatTime()}] ${message}`, data || '');
    writeToFile('INFO', message, data);
  },
  success: (message, data = null) => {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m [${formatTime()}] ${message}`, data || '');
    writeToFile('SUCCESS', message, data);
  },
  warn: (message, data = null) => {
    console.warn(`\x1b[33m[WARN]\x1b[0m [${formatTime()}] ${message}`, data || '');
    writeToFile('WARN', message, data);
  },
  error: (message, error = null) => {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(`\x1b[31m[ERROR]\x1b[0m [${formatTime()}] ${message}`, errorDetails || '');
    writeToFile('ERROR', message, errorDetails);
  },
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`\x1b[35m[DEBUG]\x1b[0m [${formatTime()}] ${message}`, data || '');
      writeToFile('DEBUG', message, data);
    }
  }
};

module.exports = logger;
