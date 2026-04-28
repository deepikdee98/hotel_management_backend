const mongoose = require("mongoose");

const systemConfigSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      unique: true,
      index: true,
    },
    currentBusinessDate: {
      type: Date,
      required: true,
    },
    nightAuditTime: {
      type: String,
      default: "00:00",
    },
    nightAuditEnabled: {
      type: Boolean,
      default: true,
    },
    lastNightAuditAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemConfig", systemConfigSchema);