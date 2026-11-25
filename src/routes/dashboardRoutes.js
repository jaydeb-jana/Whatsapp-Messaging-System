const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/', dashboardController.renderDashboard);
router.get('/docs', dashboardController.renderDocs);
router.get('/documentation', dashboardController.renderDocs);

module.exports = router;
