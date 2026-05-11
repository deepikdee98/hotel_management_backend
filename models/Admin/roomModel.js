const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true
  , immutable: true, index: true},

  roomNumber: {
    type: String,
    required: true
  },

  roomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType",
    required: true
  },

  floor: {
    type: Number,
    required: true
  },


rate: {
  type: Number,
  default: null // fallback to roomType.baseRate
},
  status: {
    type: String,
    enum: ["available", "occupied", "reserved", "cleaning", "maintenance", "blocked"],
    default: "available"
  },

  hkStatus: {
    type: String,
    enum: ["clean", "dirty"],
    default: "clean"
  }

}, { timestamps: true });

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, status: 1 });
roomSchema.index({ hotelId: 1, hkStatus: 1 });

module.exports = mongoose.model("Room", roomSchema);