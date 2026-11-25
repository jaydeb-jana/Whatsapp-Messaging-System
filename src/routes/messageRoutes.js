const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.get('/send', (req, res) => res.redirect('/whatsapp/connect'));
router.get('/history', messageController.renderHistory);

module.exports = router;
