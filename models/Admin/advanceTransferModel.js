const mongoose = require("mongoose");

const advanceTransferSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},

    fromRoomNumber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    toRoomNumber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    fromCheckin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checkin",
      required: true,
    },

    toCheckin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checkin",
      required: true,
    },

    fromGuestName: {
      type: String,
    },

    toGuestName: {
      type: String,
    },

    transferAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },

    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

advanceTransferSchema.index({ hotelId: 1, createdAt: -1 });
advanceTransferSchema.index({ hotelId: 1, fromRoomNumber: 1 });
advanceTransferSchema.index({ hotelId: 1, toRoomNumber: 1 });

module.exports = mongoose.model("AdvanceTransfer", advanceTransferSchema);
