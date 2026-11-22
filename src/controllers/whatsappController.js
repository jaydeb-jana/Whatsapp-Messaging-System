const baileysService = require('../services/whatsapp/baileysService');
const logger = require('../utils/logger');

exports.renderConnect = async (req, res, next) => {
  try {
    const addedAccounts = baileysService.getAddedAccounts();
    const slot = req.query.slot || (addedAccounts.length > 0 ? addedAccounts[0].sessionId : 'account_1');
    const currentAccount = baileysService.getAccount(slot);
    const statusInfo = currentAccount.getStatus();

    res.render('whatsapp/connect', {
      title: 'WhatsApp Connection Management',
      page: 'connect',
      accounts: addedAccounts,
      allAccounts: baileysService.getAllAccounts(),
      maxAccounts: baileysService.maxAccounts,
      selectedSlot: currentAccount.slot,
      selectedSessionId: currentAccount.sessionId,
      statusInfo,
      connectedCount: baileysService.getConnectedAccounts().length,
      addedCount: addedAccounts.length
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
      accounts: baileysService.getAllAccounts(),
      addedAccounts: baileysService.getAddedAccounts()
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
      addedAccounts: baileysService.getAddedAccounts(),
      connectedCount: baileysService.getConnectedAccounts().length,
      addedCount: baileysService.getAddedAccounts().length,
      maxAccounts: baileysService.maxAccounts
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.addAccountApi = (req, res) => {
  try {
    const result = baileysService.addAccountSlot();
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    logger.error('Error adding WhatsApp account slot:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to add account'
    });
  }
};

exports.removeAccountApi = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.body.slot;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    const result = await baileysService.removeAccountSlot(sessionId);
    return res.json(result);
  } catch (err) {
    logger.error('Error removing WhatsApp account slot:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to remove account'
    });
  }
};

exports.reconnectApi = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.body.slot || 'account_1';
    logger.info(`User requested WhatsApp reconnection for [${sessionId}]`);
    const result = await baileysService.initSocket(sessionId);
    return res.json({
      success: true,
      data: result,
      message: `Reconnection initiated for ${result.label}`
    });
  } catch (err) {
    logger.error('Error reconnecting WhatsApp:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to reconnect WhatsApp'
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
