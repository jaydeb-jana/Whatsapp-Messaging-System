const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const whatsappController = require('../controllers/whatsappController');
const messageController = require('../controllers/messageController');
const upload = require('../middleware/uploadMiddleware');
const { messagingLimiter } = require('../middleware/rateLimiter');

// Dashboard & Stats
router.get('/stats', dashboardController.getStatsApi);

// WhatsApp Account Connection
router.get('/whatsapp/status', whatsappController.getStatus);
router.get('/whatsapp/accounts', whatsappController.getAllAccountsApi);
router.post('/whatsapp/connect', whatsappController.initConnect);
router.post('/whatsapp/disconnect', whatsappController.disconnect);

// Messaging APIs
router.post('/messages/send', messagingLimiter, upload.single('media'), messageController.sendMessageApi);
router.get('/messages/history', messageController.getHistoryApi);
router.get('/messages/:id', messageController.getMessageById);

module.exports = router;
