const mongoose = require("mongoose");

const ratePlanSchema = mongoose.Schema(
{
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true
  , immutable: true, index: true},

  name: {
    type: String,
    required: true
  },

  code: {
    type: String,
    required: true,
    uppercase: true
  },

  description: {
    type: String,
    default: ""
  },

  foodIncluded: {
    type: Boolean,
    default: false
  },

  mealType: {
    type: String,
    trim: true,
    default: ""
  },

  foodCharge: {
    type: Number,
    default: 0,
    min: 0
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("RatePlan", ratePlanSchema);
