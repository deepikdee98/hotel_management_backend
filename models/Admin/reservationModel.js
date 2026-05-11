const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true
  , immutable: true, index: true},

  reservationId: {
    type: String,
    unique: true,
    sparse: true
  },

  bookingNumber: {
    type: String,
    sparse: true
  },

  guestName: {
    type: String,
    required: true
  },

  phone: String,
  email: String,

  idProofType: String,
  idProofNumber: String,

  checkInDate: {
    type: Date,
    required: true
  },

  checkOutDate: {
    type: Date,
    required: true
  },

  adults: {
    type: Number,
    default: 1
  },

  children: {
    type: Number,
    default: 0
  },

  roomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType",
    required: true
  },

  roomNumber: String,

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },

  ratePlan: String,
  referredByType: {
    type: String,
    enum: ["Walk-in", "Travel Agent", "Company", "OTA", "Member", "In-house", "Complimentary"],
    default: "Walk-in"
  },
  referredById: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  referredByName: String,
  stayType: {
    type: String,
    enum: ["Walk-in", "In-house", "Complimentary"],
    default: "Walk-in"
  },
  bookingSource: String,

  advanceAmount: {
    type: Number,
    default: 0
  },

  paymentMode: String,

  totalAmount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ["confirmed", "checked-in", "checked-out", "cancelled", "no-show"],
    default: "confirmed"
  }

}, { timestamps: true });


reservationSchema.index({ hotelId: 1, room: 1 });
reservationSchema.index({ hotelId: 1, status: 1 });
reservationSchema.index({ checkInDate: 1, checkOutDate: 1 });
reservationSchema.index({ hotelId: 1, bookingNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Reservation", reservationSchema);
