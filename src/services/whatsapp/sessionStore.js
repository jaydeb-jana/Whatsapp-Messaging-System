const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

const baseSessionDir = path.resolve(process.env.WHATSAPP_SESSION_PATH || './storage/whatsapp-sessions');

function getSessionPath(sessionId = 'default') {
  const sessionDir = path.join(baseSessionDir, sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  return sessionDir;
}

function hasExistingSession(sessionId = 'default') {
  const sessionDir = path.join(baseSessionDir, sessionId);
  const credsFile = path.join(sessionDir, 'creds.json');
  return fs.existsSync(credsFile);
}

function clearSession(sessionId = 'default') {
  try {
    const sessionDir = path.join(baseSessionDir, sessionId);
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
        fs.rmSync(path.join(sessionDir, file), { recursive: true, force: true });
      }
      logger.info(`Session files cleared for [${sessionId}]`);
      return true;
    }
  } catch (err) {
    logger.error(`Error clearing session files for [${sessionId}]:`, err);
    return false;
  }
  return true;
}

module.exports = {
  baseSessionDir,
  getSessionPath,
  hasExistingSession,
  clearSession
};
