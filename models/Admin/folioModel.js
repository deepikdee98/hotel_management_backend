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
    bookingGroupId: {
      type: String,
      index: true,
      default: "",
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
    actualCheckOutTime: {
      type: Date,
      default: null,
    },
    finalAmount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    extraCharges: {
      type: Number,
      default: 0,
    },
    checkoutMeta: {
      type: Object,
      default: {},
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending_company", "pending"],
      default: "pending",
    },
    billingType: {
      type: String,
      enum: ["full", "split", "company"],
      default: "full",
    },
    gst: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

folioSchema.index({ hotelId: 1, folioNumber: 1 }, { unique: true });
folioSchema.index({ hotelId: 1, checkinId: 1 }, { unique: true });

module.exports = mongoose.model("Folio", folioSchema);
