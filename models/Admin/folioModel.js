const mongoose = require("mongoose");

const folioSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    folioNumber: {
      type: String,
      required: true,
    },
    checkinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checkin",
      required: true,
      index: true,
    },
    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      default: null,
    },
    guestName: {
      type: String,
      required: true,
      trim: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "settled", "closed"],
      default: "open",
    },
    masterFolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      default: null,
    },
    billingInstructions: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

folioSchema.index({ hotelId: 1, folioNumber: 1 }, { unique: true });
folioSchema.index({ hotelId: 1, checkinId: 1 }, { unique: true });

module.exports = mongoose.model("Folio", folioSchema);