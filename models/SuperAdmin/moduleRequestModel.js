const mongoose = require("mongoose");

const moduleRequestSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    requestedModuleCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    justification: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

moduleRequestSchema.index({ hotelId: 1, requestedModuleCode: 1, status: 1 });

module.exports = mongoose.model("ModuleRequest", moduleRequestSchema);
