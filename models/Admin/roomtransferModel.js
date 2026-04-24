const mongoose = require("mongoose");

const roomShiftSchema = new mongoose.Schema(
{
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true,
    index: true
  },

  checkin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkin",
    required: true
  },

  oldRoomNumber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },

  newRoomNumber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },

  oldRoomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType"
  },

  newRoomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType"
  },

  planType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RatePlan"
  },

  referredBy: {
    type: String,
    enum: ["Guest", "Manager", "Housekeeping"]
  },

  remark: String

},
{ timestamps: true }
);

roomShiftSchema.index({ hotelId: 1, checkin: 1, createdAt: -1 });

module.exports = mongoose.model("RoomShift", roomShiftSchema);