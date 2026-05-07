const mongoose = require("mongoose");

const travelAgentSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    creditAllowed: {
      type: Boolean,
      default: false,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for hotelId + code uniqueness
travelAgentSchema.index({ hotelId: 1, code: 1 }, { unique: true });

// Pre-save middleware to convert code to uppercase
travelAgentSchema.pre("save", function (next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

module.exports = mongoose.model("TravelAgent", travelAgentSchema);