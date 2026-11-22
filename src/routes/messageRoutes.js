const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/send', messageController.renderSend);
router.get('/history', messageController.renderHistory);

module.exports = router;
