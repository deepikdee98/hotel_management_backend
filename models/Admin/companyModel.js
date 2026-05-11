const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["Company", "Travel Agent", "OTA"],
      default: "Company",
      index: true,
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
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for hotel-specific queries
companySchema.index({ hotelId: 1, status: 1 });
companySchema.index({ hotelId: 1, code: 1 }, { unique: true });

// Pre-save middleware to ensure code is uppercase
companySchema.pre("save", function (next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Company", companySchema);