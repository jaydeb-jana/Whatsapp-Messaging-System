const baileysService = require('../services/whatsapp/baileysService');
const logger = require('../utils/logger');

exports.renderConnect = async (req, res, next) => {
  try {
    const slot = req.query.slot || 'account_1';
    const accounts = baileysService.getAllAccounts();
    const currentAccount = baileysService.getAccount(slot);
    const statusInfo = currentAccount.getStatus();

    res.render('whatsapp/connect', {
      title: 'WhatsApp Connection Management',
      page: 'connect',
      accounts,
      selectedSlot: currentAccount.slot,
      selectedSessionId: currentAccount.sessionId,
      statusInfo
    });
  } catch (err) {
    logger.error('Error rendering WhatsApp connect page:', err);
    next(err);
  }
};

exports.getStatus = (req, res) => {
  try {
    const sessionId = req.query.sessionId || req.query.slot;
    const statusInfo = baileysService.getStatus(sessionId);
    return res.json({
      success: true,
      data: statusInfo,
      accounts: baileysService.getAllAccounts()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getAllAccountsApi = (req, res) => {
  try {
    return res.json({
      success: true,
      accounts: baileysService.getAllAccounts(),
      connectedCount: baileysService.getConnectedAccounts().length,
      maxAccounts: baileysService.maxAccounts
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.initConnect = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.body.slot || 'account_1';
    logger.info(`User requested WhatsApp connection initialization for [${sessionId}]`);
    const result = await baileysService.initSocket(sessionId);
    return res.json({
      success: true,
      data: result,
      message: `Connection initialization triggered for ${result.label}`
    });
  } catch (err) {
    logger.error('Error initializing WhatsApp connection:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to start WhatsApp connection'
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.body.slot || 'account_1';
    const logout = req.body.logout !== false; // default true
    logger.info(`User requested WhatsApp disconnect for [${sessionId}] (logout=${logout})`);
    const result = await baileysService.disconnect(sessionId, logout);
    return res.json({
      success: result.success,
      message: result.message || 'Disconnected successfully',
      data: baileysService.getStatus(sessionId),
      accounts: baileysService.getAllAccounts()
    });
  } catch (err) {
    logger.error('Error during WhatsApp disconnect:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to disconnect WhatsApp'
    });
  }
};
