const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    type: {
      type: String,
      enum: ["ROOM_CHARGE"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    businessDateKey: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "Night audit room charge",
    },
    source: {
      type: String,
      enum: ["night-audit"],
      default: "night-audit",
    },
  },
  { timestamps: true }
);

transactionSchema.index(
  { hotelId: 1, bookingId: 1, type: 1, businessDateKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);