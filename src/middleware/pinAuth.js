const { verifyPin } = require('../config/pinConfig');

function pinAuthMiddleware(req, res, next) {
  // Public paths allowed without PIN
  const publicPrefixes = [
    '/auth/pin',
    '/auth/verify',
    '/auth/logout',
    '/css/',
    '/js/',
    '/images/',
    '/favicon.svg',
    '/socket.io/'
  ];

  const isPublic = publicPrefixes.some(prefix => req.path.startsWith(prefix)) || req.path === '/favicon.ico';
  if (isPublic) {
    return next();
  }

  // Check API PIN header or param for programmatic API calls
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const headerPin = req.headers['x-api-pin'] || req.headers['x-pin'] || bearerToken || req.query?.pin || req.body?.pin;
  const isApiPinValid = headerPin ? verifyPin(headerPin) : false;

  // Check if session, signed cookie, or API PIN has verified status
  const isVerified = (req.session && req.session.isPinVerified) ||
                     (req.signedCookies && req.signedCookies.app_pin_verified === 'true') ||
                     isApiPinValid;

  if (isVerified) {
    res.locals.isPinVerified = true;
    return next();
  }

  // Defer PIN check for multipart /api/messages/send so multer can parse form fields first
  const isMultipartSend = req.method === 'POST' &&
    req.path === '/api/messages/send' &&
    (req.headers['content-type'] || '').includes('multipart/form-data');

  if (isMultipartSend) {
    return next();
  }

  // Not verified
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: 'Website is locked. Please enter your 6-digit security PIN to unlock.',
      locked: true,
      redirect: '/auth/pin'
    });
  }

  // Redirect page visitors to PIN lock screen
  return res.redirect('/auth/pin');
}

module.exports = pinAuthMiddleware;
