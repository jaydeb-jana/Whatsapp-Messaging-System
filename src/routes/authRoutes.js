const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/pin', authController.renderPinPage);
router.post('/pin', authController.verifyPinAction);
router.get('/logout', authController.lockSession);
router.post('/lock', authController.lockSession);

module.exports = router;
