const messageService = require('../services/whatsapp/messageService');
const baileysService = require('../services/whatsapp/baileysService');
const Message = require('../models/Message');
const logger = require('../utils/logger');

exports.renderSend = async (req, res, next) => {
  try {
    const statusInfo = baileysService.getStatus();
    const accounts = baileysService.getAllAccounts();
    const connectedAccounts = baileysService.getConnectedAccounts();

    res.render('messages/send', {
      title: 'Send WhatsApp Message',
      page: 'send',
      statusInfo,
      accounts,
      connectedAccounts
    });
  } catch (err) {
    logger.error('Error rendering send message page:', err);
    next(err);
  }
};

exports.renderHistory = async (req, res, next) => {
  try {
    const { page = 1, status = '', type = '', search = '' } = req.query;
    const statusInfo = baileysService.getStatus();
    const historyData = await messageService.getHistory({
      page: parseInt(page, 10) || 1,
      limit: 15,
      status,
      type,
      search
    });

    res.render('messages/history', {
      title: 'Message History & Audit',
      page: 'history',
      statusInfo,
      history: historyData,
      query: { page, status, type, search }
    });
  } catch (err) {
    logger.error('Error rendering message history page:', err);
    next(err);
  }
};

exports.sendMessageApi = async (req, res) => {
  try {
    const { recipient, messageType, content, customFileName, idempotencyKey, senderAccount } = req.body;
    const file = req.file || null;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: 'Recipient phone number is required.'
      });
    }

    if (!messageType || !['text', 'image', 'video', 'document'].includes(messageType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing messageType. Supported types: text, image, video, document.'
      });
    }

    const result = await messageService.sendMessage({
      senderAccount: senderAccount || null,
      recipient,
      messageType,
      content,
      file,
      customFileName,
      idempotencyKey
    });

    return res.json({
      success: true,
      message: 'Message sent successfully!',
      data: result
    });
  } catch (err) {
    logger.error('Error in sendMessageApi:', err.message);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to dispatch message.'
    });
  }
};

exports.getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findOne({
      $or: [{ messageId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    return res.json({
      success: true,
      data: message
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getHistoryApi = async (req, res) => {
  try {
    const { page, limit, status, type, search } = req.query;
    const result = await messageService.getHistory({ page, limit, status, type, search });
    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
