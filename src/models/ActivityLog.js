const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['connection', 'messaging', 'system', 'auth'],
      index: true
    },
    event: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: ''
    },
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'success'],
      default: 'info'
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
