const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    businessDateKey: {
      type: String,
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ["info", "error"],
      default: "info",
    },
    step: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    context: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);