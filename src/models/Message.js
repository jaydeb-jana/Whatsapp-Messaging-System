const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    senderSessionId: {
      type: String,
      default: 'account_1',
      index: true
    },
    senderPhone: {
      type: String,
      default: null
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    recipientJid: {
      type: String,
      required: true,
      trim: true
    },
    messageType: {
      type: String,
      required: true,
      enum: ['text', 'image', 'video', 'document'],
      index: true
    },
    content: {
      type: String,
      default: ''
    },
    mediaUrl: {
      type: String,
      default: null
    },
    fileName: {
      type: String,
      default: null
    },
    fileSize: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: null
    },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'sending', 'sent', 'failed'],
      default: 'queued',
      index: true
    },
    errorMessage: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common queries
messageSchema.index({ createdAt: -1 });
messageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
