const mongoose = require("mongoose");

const roomAdvanceSchema = new mongoose.Schema(
{
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true,
    index: true,
    immutable: true
  },

  checkin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkin",
    required: true
  },

  roomNumber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },

  bookingNo: {
    type: String
  },

  guestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkin",
    required: true
  },

  guestName: {
    type: String
  },

  advanceAmount: {
    type: Number,
    required: true
  },

  paymentMode: {
    type: String,
    enum: ["Cash", "Card", "UPI", "Online", "Bank Transfer", "Other"],
    required: true
  },

  ledgerAccount: {
    type: String,
    enum: [
      "HDFC Hotel Account",
      "SBI Hotel Account",
      "ICICI Hotel Account",
      "Cash Account",
      "Cash",
      "Other"
    ]
  },

  panNo: {
    type: String
  },

  noOfPrint: {
    type: Number,
    default: 1
  },

  remarks: {
    type: String
  }

},
{ timestamps: true }
);

roomAdvanceSchema.index({ hotelId: 1, checkin: 1, createdAt: -1 });

module.exports = mongoose.model("RoomAdvance", roomAdvanceSchema);