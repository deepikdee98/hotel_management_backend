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
    bookingPrefix: {
      type: String,
      default: "NOV",
      trim: true,
      uppercase: true,
    },
    startNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    digitLength: {
      type: Number,
      default: 4,
      min: 1,
    },
    resetFinancialYear: {
      type: Boolean,
      default: true,
    },
    currentNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    currentFinancialYear: {
      type: String,
      default: null,
    },
    financialYearFormat: {
      type: String,
      default: "YYYY-YY",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemConfig", systemConfigSchema);
