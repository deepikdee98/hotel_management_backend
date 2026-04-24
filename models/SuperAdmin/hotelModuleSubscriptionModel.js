const mongoose = require("mongoose");

const hotelModuleSubscriptionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    moduleCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending-activation", "suspended"],
      default: "active",
    },
    billingPlan: {
      type: String,
      default: "",
    },
    activationSource: {
      type: String,
      enum: ["subscription", "request-approved", "trial", "manual"],
      default: "manual",
    },
    enabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    enabledAt: {
      type: Date,
      default: null,
    },
    disabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    disabledAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

hotelModuleSubscriptionSchema.index({ hotelId: 1, moduleCode: 1 }, { unique: true });

module.exports = mongoose.model("HotelModuleSubscription", hotelModuleSubscriptionSchema);
