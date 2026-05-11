const mongoose = require("mongoose");

const checkinSchema = new mongoose.Schema({

  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true,
    index: true,
  immutable: true},

  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reservation",
    default: null,
  },

  bookingGroupId: {
    type: String,
    index: true,
  },

  parentGuestCheckin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Checkin",
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
  amount: {
    type: Number,
    default: 0
  },
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
  gstPercentage: {
    type: Number,
    default: 0
  },
  gstType: {
    type: String,
    enum: ["INCLUSIVE", "EXCLUSIVE"],
    default: "EXCLUSIVE"
  },
  gstAmount: {
    type: Number,
    default: 0
  },
  noOfBeds: Number,
  adultMale: Number,
  adultFemale: Number,
  children: Number,
  totalPax: Number,
  status: {
    type: String,
    enum: ["checked-in", "checked-out"],
    default: "checked-in"
  },

  services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service"
    },
    name: String,
    price: Number,
    chargeType: String
  }],

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
  bookingNumber: String,
  paymentMode: String,
  advanceAmount: Number,
  ledgerAccount: String,

  remarks: String,

  companions: [{
    name: String,
    mobile: String,
    gender: String,
    type: String,
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
checkinSchema.index({ hotelId: 1, bookingNumber: 1 }, { unique: true, sparse: true });
checkinSchema.index({ hotelId: 1, bookingGroupId: 1 });

module.exports = mongoose.model("Checkin", checkinSchema);
