const { verifyPin, getAppPin } = require('../config/pinConfig');
const logger = require('../utils/logger');

exports.renderPinPage = (req, res) => {
  // If already verified, go to dashboard
  const isVerified = (req.session && req.session.isPinVerified) ||
                     (req.signedCookies && req.signedCookies.app_pin_verified === 'true');
  if (isVerified) {
    return res.redirect('/');
  }

  const error = req.query.error || null;
  res.render('auth/pin', {
    layout: false,
    title: 'Security PIN Lock',
    error,
    expectedLength: getAppPin().length
  });
};

exports.verifyPinAction = (req, res) => {
  const pin = req.body.pin || '';
  const isCorrect = verifyPin(pin);

  if (isCorrect) {
    // Save state in session and signed cookie
    if (req.session) {
      req.session.isPinVerified = true;
    }

    res.cookie('app_pin_verified', 'true', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax'
      // Session cookie without maxAge: expires automatically when tab/browser is closed
    });

    logger.success('User successfully unlocked platform with valid PIN');

    if (req.xhr || req.headers.accept?.includes('json') || req.is('json')) {
      return res.json({
        success: true,
        message: 'Successfully unlocked!',
        redirect: '/'
      });
    }

    return res.redirect('/');
  }

  // Failed PIN
  logger.warn('Failed PIN unlock attempt');

  if (req.xhr || req.headers.accept?.includes('json') || req.is('json')) {
    return res.status(400).json({
      success: false,
      error: 'Incorrect PIN! Please enter the correct 6-digit security PIN.'
    });
  }

  return res.render('auth/pin', {
    layout: false,
    title: 'Security PIN Lock',
    error: 'Incorrect PIN! Please enter the correct 6-digit security PIN.',
    expectedLength: getAppPin().length
  });
};

exports.lockSession = (req, res) => {
  if (req.session) {
    req.session.isPinVerified = false;
  }
  res.clearCookie('app_pin_verified');
  logger.info('User locked session.');
  return res.redirect('/auth/pin');
};
