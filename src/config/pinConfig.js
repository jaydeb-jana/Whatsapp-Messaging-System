const logger = require('../utils/logger');

function getAppPin() {
  const raw = (process.env.APP_PIN || '123456').trim();

  // Validate that it consists ONLY of numbers/digits
  if (!/^\d+$/.test(raw)) {
    const sanitized = raw.replace(/\D/g, '');
    logger.warn(`APP_PIN in .env ("${raw}") contains non-digit characters! Only numbers are permitted. Using sanitized digits: "${sanitized || '123456'}"`);
    return sanitized || '123456';
  }

  return raw;
}

function verifyPin(input) {
  if (!input) return false;
  const cleanedInput = String(input).trim();
  const actualPin = getAppPin();
  return cleanedInput === actualPin;
}

module.exports = {
  getAppPin,
  verifyPin
};
