const mongoose = require("mongoose");

const referralSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["Company", "Travel Agent", "OTA"],
      required: true,
    },
    contactPerson: String,
    mobile: String,
    email: String,
    gstNumber: String,
    commissionPercentage: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Referral", referralSchema);
