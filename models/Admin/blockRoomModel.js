const mongoose = require("mongoose");

const blockRoomSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    remark: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

blockRoomSchema.index({ hotelId: 1, room: 1, isActive: 1 });

module.exports = mongoose.model("BlockRoom", blockRoomSchema);