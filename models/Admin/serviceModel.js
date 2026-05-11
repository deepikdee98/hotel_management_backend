const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema(
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
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
    },

    category: {
      type: String,
      default: "Other",
    },

    description: {
      type: String,
      default: "",
    },

    defaultPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    chargeType: {
      type: String,
      enum: ["PER_DAY", "PER_STAY"],
      default: "PER_STAY",
    },

    gstApplicable: {
      type: Boolean,
      default: false,
    },

    gstPercentage: {
      type: Number,
      default: 0,
    },

    isFood: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
