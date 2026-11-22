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

  // Check if session or signed cookie has verified status
  const isVerified = (req.session && req.session.isPinVerified) ||
                     (req.signedCookies && req.signedCookies.app_pin_verified === 'true');

  if (isVerified) {
    res.locals.isPinVerified = true;
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
