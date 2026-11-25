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

exports.startPairingApi = (req, res) => {
  try {
    const result = baileysService.startNewAccountPairing();
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    logger.error('Error starting new account pairing:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to start pairing'
    });
  }
};

exports.requestPairingCodeApi = async (req, res) => {
  try {
    let { sessionId, phoneNumber, countryCode } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your WhatsApp phone number.'
      });
    }

    let cleanPhone = String(phoneNumber).replace(/\D/g, '');
    let cleanCountry = countryCode ? String(countryCode).replace(/\D/g, '') : '';

    if (cleanPhone.startsWith('00')) {
      cleanPhone = cleanPhone.substring(2);
    }

    // Smart country code resolution
    if (cleanCountry && cleanCountry !== 'custom') {
      if (!cleanPhone.startsWith(cleanCountry)) {
        if (cleanCountry === '880' && cleanPhone.startsWith('0')) {
          cleanPhone = cleanPhone.substring(1);
        }
        cleanPhone = cleanCountry + cleanPhone;
      }
    } else {
      // Auto-detect common South Asian numbers missing country prefix
      if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
        cleanPhone = '91' + cleanPhone;
        logger.info(`Auto-detected Indian mobile number: formatted to +${cleanPhone}`);
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
        cleanPhone = '880' + cleanPhone.substring(1);
        logger.info(`Auto-detected Bangladesh mobile number: formatted to +${cleanPhone}`);
      }
    }

    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      return res.status(400).json({
        success: false,
        error: `Invalid phone number length (${cleanPhone.length} digits). Please enter a valid international mobile number.`
      });
    }

    const targetSessionId = sessionId || 'account_1';
    const result = await baileysService.requestPairingCode(targetSessionId, cleanPhone);
    return res.json(result);
  } catch (err) {
    logger.error('Error requesting pairing code:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate pairing code from WhatsApp'
    });
  }
};

exports.cancelPairingApi = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.body.slot;
    if (sessionId) {
      await baileysService.cancelPairing(sessionId);
    }
    return res.json({ success: true, message: 'Pairing cancelled' });
  } catch (err) {
    logger.error('Error cancelling pairing:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to cancel pairing'
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
    logger.info(`User requested WhatsApp reconnection for [${sessionId}]. Purging old session and initializing fresh...`);
    const result = await baileysService.reconnect(sessionId, true);
    return res.json({
      success: true,
      data: result,
      message: `Reconnection initiated with fresh session for ${result.label}`
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
    const forceFresh = req.body.forceFresh === true;
    logger.info(`User requested WhatsApp connection initialization for [${sessionId}] (forceFresh=${forceFresh})`);
    const result = forceFresh
      ? await baileysService.reconnect(sessionId, true)
      : await baileysService.initSocket(sessionId, false);
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
