const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    folioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      default: null,
    },
    checkin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checkin",
      default: null,
    },
    guestName: {
      type: String,
      required: true,
      trim: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["Housekeeping", "Maintenance", "F&B", "Staff", "Noise", "Other"],
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    resolution: String,
    resolvedBy: String,
    resolvedAt: Date,
    compensationProvided: String,
    reportedAt: Date,
    reportedTo: String,
  },
  { timestamps: true }
);

complaintSchema.index({ hotelId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Complaint", complaintSchema);
