const path = require('path');
const messageService = require('../services/whatsapp/messageService');
const baileysService = require('../services/whatsapp/baileysService');
const Message = require('../models/Message');
const logger = require('../utils/logger');

exports.renderSend = async (req, res, next) => {
  try {
    const statusInfo = baileysService.getStatus();
    const accounts = baileysService.getAddedAccounts();
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
    // Forgiving parameter mapping (supports recipient, phone, to, number)
    const recipient = req.body.recipient || req.body.phone || req.body.to || req.body.number;
    const content = req.body.content || req.body.message || req.body.text || req.body.caption || '';
    const senderAccount = req.body.senderAccount || req.body.account || req.body.slot || null;
    const customFileName = req.body.customFileName || req.body.filename || req.body.fileName || null;
    const idempotencyKey = req.body.idempotencyKey || null;

    // File can come from req.file or req.files (upload.any() or upload.single())
    const file = (req.files && req.files.length > 0) ? req.files[0] : (req.file || null);

    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: 'Recipient phone number is required (e.g. +8801712345678).'
      });
    }

    // Auto-detect messageType if not specified
    let messageType = (req.body.messageType || req.body.type || '').toLowerCase().trim();

    if (!messageType) {
      if (file) {
        const mime = (file.mimetype || '').toLowerCase();
        const ext = path.extname(file.originalname).toLowerCase();

        if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(ext)) {
          messageType = 'image';
        } else if (mime.startsWith('video/') || ['.mp4', '.3gp', '.mov', '.mkv', '.avi', '.webm'].includes(ext)) {
          messageType = 'video';
        } else if (mime.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.flac'].includes(ext)) {
          messageType = 'audio';
        } else {
          messageType = 'document';
        }
      } else if (content && content.trim()) {
        messageType = 'text';
      } else {
        return res.status(400).json({
          success: false,
          error: 'Please provide message text or attach a file (image, video, audio, or document).'
        });
      }
    }

    const validTypes = ['text', 'image', 'video', 'document', 'audio'];
    if (!validTypes.includes(messageType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid messageType "${messageType}". Supported types: ${validTypes.join(', ')}.`
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
