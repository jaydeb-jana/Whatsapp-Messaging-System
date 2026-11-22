const mongoose = require('mongoose');

const whatsAppSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: 'default_session',
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ['disconnected', 'connecting', 'connected', 'reconnecting'],
      default: 'disconnected',
      index: true
    },
    phoneNumber: {
      type: String,
      default: null
    },
    pushName: {
      type: String,
      default: null
    },
    jid: {
      type: String,
      default: null
    },
    platform: {
      type: String,
      default: 'Baileys Multi-Device'
    },
    connectedAt: {
      type: Date,
      default: null
    },
    disconnectedAt: {
      type: Date,
      default: null
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    reconnectCount: {
      type: Number,
      default: 0
    },
    qrGeneratedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WhatsAppSession', whatsAppSessionSchema);
