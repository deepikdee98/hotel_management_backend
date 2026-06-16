const mongoose = require("mongoose");

const floorSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    name: {
      type: String,
      required: true,
      trim: true,
    },
    floorNumber: {
      type: Number,
      required: true,
    },
    floorType: {
      type: String,
      enum: ["rooms", "banquet"],
      default: "rooms",
    },
    roomConfigurations: [
      {
        roomTypeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RoomType",
          required: true,
        },
        count: {
          type: Number,
          required: true,
        },
        acType: {
          type: String,
          enum: ["AC", "NON_AC"],
          default: "NON_AC",
        },
        startingRoomNumber: {
          type: String,
          required: true,
        },
        roomNumberFormat: {
          type: String,
          enum: ["numeric", "alphanumeric"],
          default: "numeric",
        },
        rooms: [String],
      },
    ],
  },
  { timestamps: true }
);

floorSchema.index({ hotelId: 1, floorNumber: 1 }, { unique: true });

module.exports = mongoose.model("Floor", floorSchema);
