const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mimeTypes = require('mime-types');
const baileysService = require('./baileysService');
const { validatePhoneNumber } = require('../../utils/phoneValidator');
const Message = require('../../models/Message');
const ActivityLog = require('../../models/ActivityLog');
const logger = require('../../utils/logger');

class MessageService {
  /**
   * Send a WhatsApp message (Text, Image, Video, Document)
   * @param {Object} options
   * @param {string} options.recipient - Phone number (e.g. +8801712345678 or 8801712345678)
   * @param {string} options.messageType - 'text' | 'image' | 'video' | 'document'
   * @param {string} [options.content] - Text content or media caption
   * @param {Object} [options.file] - Multer uploaded file object
   * @param {string} [options.customFileName] - Custom filename for documents
   * @param {string} [options.idempotencyKey] - Token to prevent duplicate submissions
   */
  async sendMessage({ senderAccount = null, recipient, messageType, content = '', file = null, customFileName = null, idempotencyKey = null }) {
    // 1. Prevent duplicate submission if idempotency key passed and already processed
    if (idempotencyKey) {
      const existing = await Message.findOne({ messageId: idempotencyKey });
      if (existing) {
        if (existing.status === 'sent') {
          return { success: true, message: existing, duplicate: true };
        }
        if (existing.status === 'sending') {
          throw new Error('This message is currently being processed. Please do not submit twice.');
        }
      }
    }

    // 2. Select sender account and verify connection
    const targetAccount = senderAccount ? baileysService.getAccount(senderAccount) : null;
    const senderSession = (targetAccount && targetAccount.isConnected())
      ? targetAccount
      : baileysService.accounts.get(baileysService.getConnectedAccounts()[0]?.sessionId);

    if (!senderSession || !senderSession.isConnected()) {
      throw new Error(senderAccount ? `Selected WhatsApp account (${targetAccount?.label || senderAccount}) is not connected.` : 'WhatsApp is not connected. Please connect via QR code first.');
    }

    const sock = senderSession.socket;
    if (!sock) {
      throw new Error(`WhatsApp socket for ${senderSession.label} is unavailable.`);
    }

    // 3. Validate recipient
    const phoneValidation = validatePhoneNumber(recipient);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error);
    }

    const { cleanedNumber, jid, displayNumber, country } = phoneValidation;
    const messageId = idempotencyKey || uuidv4();

    // 4. Create initial Message record in MongoDB
    let mediaUrl = null;
    let fileName = null;
    let fileSize = 0;
    let mimeType = null;

    if (file) {
      mediaUrl = `/uploads/${file.filename}`;
      fileName = customFileName ? customFileName.trim() : file.originalname;
      fileSize = file.size;
      mimeType = file.mimetype || mimeTypes.lookup(file.originalname) || 'application/octet-stream';
    }

    let messageRecord;
    try {
      messageRecord = await Message.create({
        messageId,
        senderSessionId: senderSession.sessionId,
        senderPhone: senderSession.accountInfo?.formattedPhone || senderSession.accountInfo?.phoneNumber || null,
        recipient: displayNumber,
        recipientJid: jid,
        messageType,
        content: content ? content.trim() : '',
        mediaUrl,
        fileName,
        fileSize,
        mimeType,
        status: 'sending',
        metadata: {
          country,
          senderLabel: senderSession.label,
          originalName: file ? file.originalname : null
        }
      });
    } catch (dbErr) {
      logger.error('Failed to create initial message record in DB:', dbErr);
      messageRecord = {
        _id: messageId,
        messageId,
        senderSessionId: senderSession.sessionId,
        senderPhone: senderSession.accountInfo?.formattedPhone || null,
        recipient: displayNumber,
        recipientJid: jid,
        messageType,
        content,
        mediaUrl,
        fileName,
        fileSize,
        mimeType,
        status: 'sending',
        createdAt: new Date()
      };
    }

    // Broadcast sending event
    baileysService.broadcast('message:sending', {
      messageId,
      recipient: displayNumber,
      messageType,
      timestamp: new Date()
    });

    // 5. Build Baileys message payload
    let baileysPayload = null;

    try {
      switch (messageType) {
        case 'text': {
          if (!content || !content.trim()) {
            throw new Error('Message text content cannot be empty.');
          }
          baileysPayload = {
            text: content.trim()
          };
          break;
        }

        case 'image': {
          if (!file) {
            throw new Error('Image file is required for image message type.');
          }
          const fileBuffer = fs.readFileSync(file.path);
          baileysPayload = {
            image: fileBuffer,
            caption: content ? content.trim() : undefined,
            mimetype: mimeType || 'image/jpeg'
          };
          break;
        }

        case 'video': {
          if (!file) {
            throw new Error('Video file is required for video message type.');
          }
          const fileBuffer = fs.readFileSync(file.path);
          baileysPayload = {
            video: fileBuffer,
            caption: content ? content.trim() : undefined,
            mimetype: mimeType || 'video/mp4'
          };
          break;
        }

        case 'document': {
          if (!file) {
            throw new Error('Document file is required for document message type.');
          }
          const fileBuffer = fs.readFileSync(file.path);
          baileysPayload = {
            document: fileBuffer,
            mimetype: mimeType || 'application/pdf',
            fileName: fileName || file.originalname,
            caption: content ? content.trim() : undefined
          };
          break;
        }

        default:
          throw new Error(`Unsupported message type: ${messageType}`);
      }

      // 6. Send via Baileys socket
      logger.info(`Sending ${messageType} message to ${jid} (${displayNumber})...`);
      const sentResult = await sock.sendMessage(jid, baileysPayload);

      const baileyId = sentResult?.key?.id || messageId;

      // 7. Update status to 'sent'
      const now = new Date();
      if (messageRecord.save) {
        messageRecord.status = 'sent';
        messageRecord.sentAt = now;
        messageRecord.metadata = {
          ...messageRecord.metadata,
          baileyMessageId: baileyId
        };
        await messageRecord.save();
      } else {
        await Message.findOneAndUpdate(
          { messageId },
          { $set: { status: 'sent', sentAt: now, 'metadata.baileyMessageId': baileyId } }
        );
      }

      await ActivityLog.create({
        type: 'messaging',
        event: 'Message Sent',
        details: `Sent ${messageType} message to ${displayNumber}`,
        level: 'success',
        meta: { messageId, baileyId, recipient: displayNumber, messageType }
      });

      logger.success(`Message sent successfully to ${displayNumber} (ID: ${baileyId})`);

      // Broadcast success
      baileysService.broadcast('message:sent', {
        messageId,
        baileyId,
        recipient: displayNumber,
        messageType,
        sentAt: now
      });

      return {
        success: true,
        messageId,
        baileyId,
        recipient: displayNumber,
        messageType,
        status: 'sent',
        sentAt: now
      };
    } catch (sendErr) {
      logger.error(`Failed to send message to ${displayNumber}:`, sendErr.message);

      const errorMessage = sendErr.message || 'Unknown error while transmitting message via WhatsApp.';

      if (messageRecord.save) {
        messageRecord.status = 'failed';
        messageRecord.errorMessage = errorMessage;
        await messageRecord.save();
      } else {
        await Message.findOneAndUpdate(
          { messageId },
          { $set: { status: 'failed', errorMessage } }
        );
      }

      await ActivityLog.create({
        type: 'messaging',
        event: 'Message Failed',
        details: `Failed to send ${messageType} message to ${displayNumber}: ${errorMessage}`,
        level: 'error',
        meta: { messageId, recipient: displayNumber, error: errorMessage }
      });

      baileysService.broadcast('message:failed', {
        messageId,
        recipient: displayNumber,
        messageType,
        error: errorMessage
      });

      throw new Error(`WhatsApp delivery failed: ${errorMessage}`);
    }
  }

  /**
   * Get message history with filters and pagination
   */
  async getHistory({ page = 1, limit = 20, status = '', type = '', search = '' } = {}) {
    const query = {};

    if (status && ['sent', 'failed', 'sending', 'queued'].includes(status)) {
      query.status = status;
    }

    if (type && ['text', 'image', 'video', 'document'].includes(type)) {
      query.messageType = type;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[+]/g, ''), 'i');
      query.$or = [
        { recipient: searchRegex },
        { content: searchRegex },
        { fileName: searchRegex }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [messages, total] = await Promise.all([
      Message.find(query).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
      Message.countDocuments(query)
    ]);

    return {
      messages,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / take) || 1,
      limit: take
    };
  }

  /**
   * Get dashboard statistics
   */
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, sent, failed, sentToday, recentMessages] = await Promise.all([
      Message.countDocuments({}),
      Message.countDocuments({ status: 'sent' }),
      Message.countDocuments({ status: 'failed' }),
      Message.countDocuments({ status: 'sent', sentAt: { $gte: today } }),
      Message.find({}).sort({ createdAt: -1 }).limit(8).lean()
    ]);

    const successRate = total > 0 ? Math.round((sent / total) * 100) : 100;

    return {
      total,
      sent,
      failed,
      sentToday,
      successRate,
      recentMessages
    };
  }
}

module.exports = new MessageService();
