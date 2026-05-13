const mongoose = require("mongoose");

const hotelSchema = mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },

    email: { 
      type: String, 
      required: true, 
      unique: true 
    },

    phone: { 
      type: String, 
      required: true 
    },

    address: { 
      type: String, 
      required: true 
    },

    city: { 
      type: String, 
      required: true 
    },

    country: { 
      type: String, 
      required: true 
    },

    gstNumber: { 
      type: String 
    },

    totalRooms: { 
      type: Number, 
      default: 0 
    },

    checkInTime: { 
      type: String, 
      default: "14:00" 
    },

    checkOutTime: { 
      type: String, 
      default: "11:00" 
    },

    currency: { 
      type: String, 
      default: "INR" 
    },

    dateFormat: {
      type: String,
      enum: ["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"],
      default: "DD-MM-YYYY"
    },

    modules: [
      {
        type: String,
        enum: [
          "front-office",
          "point-of-sale",
          "housekeeping",
          "accounts",
          "inventory",
          "reports",
        ],
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive", "pending", "suspended"],
      default: "active",
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isSetupCompleted: {
      type: Boolean,
      default: false
    },

    expiryDate: {
      type: Date,
      required: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hotel", hotelSchema);