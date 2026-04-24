const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true
  },

  reservationId: {
    type: String,
    unique: true,
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
    enum: ["confirmed", "checked-in", "checked-out", "cancelled"],
    default: "confirmed"
  }

}, { timestamps: true });


reservationSchema.index({ hotelId: 1, room: 1 });
reservationSchema.index({ hotelId: 1, status: 1 });
reservationSchema.index({ checkInDate: 1, checkOutDate: 1 });

module.exports = mongoose.model("Reservation", reservationSchema);