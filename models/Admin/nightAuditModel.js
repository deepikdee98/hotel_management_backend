const mongoose = require("mongoose");

const nightAuditSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    auditDate: {
      type: String,
      required: true,
    },
    tasks: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      enum: ["Completed", "Failed"],
      default: "Completed",
    },
    summary: {
      type: Object,
      default: {},
    },
    reports: {
      type: Object,
      default: {},
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NightAudit", nightAuditSchema);
