const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: String,
    phone: String,
    title: String,
    gender: String,
    country: String,
    state: String,
    city: String,
    zip: String,
    company: String,
    gstNumber: String,
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
    idType: {
      type: String,
      default: "other",
    },

    idNumber: String,
    address: String,

    nationality: String, // 👉 used as country in UI

    visits: {
      type: Number,
      default: 0,
    },

    totalSpent: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Guest", guestSchema);