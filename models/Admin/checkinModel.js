const mongoose = require("mongoose");

const checkinSchema = new mongoose.Schema({

  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true,
    index: true,
  },

  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reservation",
    default: null,
  },

  title: String,
  guestName: { type: String, required: true },

  mobileNo: String,
  email: String,
  dob: Date,

  gender: String,
  nationality: String,
  gstNumber: String,
  registerNo: String,
  idProofType: String,
  idProofNumber: String,
  address: String,

  country: String,
  state: String,
  city: String,
  zip: String,

  referredBy: String,
  referredName: String,
  arrivalFrom: String,
  departureTo: String,
  purposeOfVisit: String,
  businessSource: String,
  marketSegment: String,
  company: String,
  voucherNo: String,

  checkInDate: {
    type: Date,
    default: Date.now
  },

  nights: {
    type: Number,
    default: 1
  },

  checkoutPlan: String,

  guestClassification: String,

  roomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType"
  },

  roomNumber: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },

  planType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RatePlan"
  },

  planCharges: Number,
  foodCharges: Number,
  discount: Number,
  noOfBeds: Number,
  adultMale: Number,
  adultFemale: Number,
  children: Number,

  guestType: {
    type: String,
    default: "Individual"
  },

  relation: String,

  mainCheckin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkin"
  },

  bookingNo: String,
  paymentMode: String,
  advanceAmount: Number,
  ledgerAccount: String,

  remarks: String,

  companions: [{
    name: String,
    mobile: String,
    idType: String,
    idNumber: String,
    _id: false
  }],

  vehicleNo: String,
  vehicleType: String,

  companyInfo: {
    companyName: String,
    ledgerGroup: String,
    pan: String,
    gst: String,
    bankAccountNo: String,
    ifscCode: String,
    creditLimit: {
      type: Number,
      default: 0
    },
    bookingCategory: String
  }

}, { timestamps: true });

checkinSchema.index({ hotelId: 1, roomNumber: 1, createdAt: -1 });
checkinSchema.index({ hotelId: 1, bookingNo: 1 });

module.exports = mongoose.model("Checkin", checkinSchema);