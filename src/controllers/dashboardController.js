const baileysService = require('../services/whatsapp/baileysService');
const messageService = require('../services/whatsapp/messageService');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

exports.renderDashboard = async (req, res, next) => {
  try {
    const statusInfo = baileysService.getStatus();
    const accounts = baileysService.getAllAccounts();
    const connectedAccounts = baileysService.getConnectedAccounts();
    const stats = await messageService.getStats();
    const recentActivities = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.render('dashboard/index', {
      title: 'Dashboard Overview',
      page: 'dashboard',
      statusInfo,
      accounts,
      connectedCount: connectedAccounts.length,
      maxAccounts: baileysService.maxAccounts,
      stats,
      recentActivities
    });
  } catch (err) {
    logger.error('Error rendering dashboard:', err);
    next(err);
  }
};

exports.renderDocs = async (req, res, next) => {
  try {
    const statusInfo = baileysService.getStatus();
    const accounts = baileysService.getAddedAccounts();
    const connectedAccounts = baileysService.getConnectedAccounts();

    res.render('docs/index', {
      title: 'Documentation & API Reference',
      page: 'docs',
      statusInfo,
      accounts,
      connectedAccounts,
      maxAccounts: baileysService.maxAccounts
    });
  } catch (err) {
    logger.error('Error rendering documentation page:', err);
    next(err);
  }
};

exports.getStatsApi = async (req, res) => {
  try {
    const stats = await messageService.getStats();
    const statusInfo = baileysService.getStatus();
    return res.json({
      success: true,
      stats,
      statusInfo
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
