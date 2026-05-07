const mongoose = require("mongoose");

const nightAuditReportSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    businessDateKey: {
      type: String,
      required: true,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    occupancyRate: {
      type: Number,
      default: 0,
    },
    noShowCount: {
      type: Number,
      default: 0,
    },
    transactionsCount: {
      type: Number,
      default: 0,
    },
    errors: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "completed_with_errors", "failed"],
      default: "in_progress",
    },
    steps: [
      {
        id: String,
        label: String,
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed", "failed"],
          default: "pending",
        },
        completedAt: Date,
        error: String,
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    triggerSource: {
      type: String,
      enum: ["manual", "cron"],
      default: "manual",
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

nightAuditReportSchema.index({ hotelId: 1, businessDateKey: 1 }, { unique: true });

module.exports = mongoose.model("NightAuditReport", nightAuditReportSchema);