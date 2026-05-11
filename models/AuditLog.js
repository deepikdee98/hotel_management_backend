const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
      immutable: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    action: {
      type: String,
      required: false,
      enum: ["CREATE", "UPDATE", "DELETE", "REFUND", "LOGIN", "OTHER", "SYSTEM"],
    },
    module: {
      type: String,
      required: false,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    // Progress/System logging fields
    businessDateKey: {
      type: String,
      index: true,
    },
    step: {
      type: String,
    },
    message: {
      type: String,
    },
    level: {
      type: String,
      enum: ["info", "warn", "error"],
      default: "info",
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
    },
    oldData: {
      type: mongoose.Schema.Types.Mixed,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying per hotel
auditLogSchema.index({ hotelId: 1, createdAt: -1 });
auditLogSchema.index({ hotelId: 1, module: 1 });
auditLogSchema.index({ hotelId: 1, entityId: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);