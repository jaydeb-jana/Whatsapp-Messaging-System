const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const whatsappController = require('../controllers/whatsappController');
const messageController = require('../controllers/messageController');
const upload = require('../middleware/uploadMiddleware');
const { messagingLimiter } = require('../middleware/rateLimiter');
const { verifyPin } = require('../config/pinConfig');

// Route-level PIN guard (verifies req.body.pin after multipart upload has parsed)
const ensureApiPinVerified = (req, res, next) => {
  if (res.locals.isPinVerified) {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const pin = req.headers['x-api-pin'] || req.headers['x-pin'] || bearerToken || req.query?.pin || req.body?.pin;

  if (pin && verifyPin(pin)) {
    res.locals.isPinVerified = true;
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid or missing security PIN. Pass x-api-pin header or pin in body/query.',
    locked: true
  });
};

// Dashboard & Stats
router.get('/stats', dashboardController.getStatsApi);

// WhatsApp Account Connection
router.get('/whatsapp/status', whatsappController.getStatus);
router.get('/whatsapp/accounts', whatsappController.getAllAccountsApi);
router.post('/whatsapp/connect', whatsappController.initConnect);
router.post('/whatsapp/disconnect', whatsappController.disconnect);
router.post('/whatsapp/reconnect', whatsappController.reconnectApi);
router.post('/whatsapp/accounts/start-pairing', whatsappController.startPairingApi);
router.post('/whatsapp/pairing-code', whatsappController.requestPairingCodeApi);
router.post('/whatsapp/pairing/cancel', whatsappController.cancelPairingApi);
router.post('/whatsapp/accounts/add', whatsappController.addAccountApi);
router.post('/whatsapp/accounts/remove', whatsappController.removeAccountApi);

// Messaging APIs
router.post('/messages/send', messagingLimiter, upload.any(), ensureApiPinVerified, messageController.sendMessageApi);
router.get('/messages/history', messageController.getHistoryApi);
router.get('/messages/:id', messageController.getMessageById);

module.exports = router;
