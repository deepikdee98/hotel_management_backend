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

    idType: {
      type: String,
      enum: ["passport", "aadhaar", "driving-license", "other"],
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