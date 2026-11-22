const rateLimit = require('express-rate-limit');

// General rate limiter for standard web and API requests
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

// Stricter rate limiter specifically for sending messages to prevent accidental spam
const messagingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Message rate limit exceeded. Please wait a moment before sending more messages.'
  }
});

module.exports = {
  generalLimiter,
  messagingLimiter
};
