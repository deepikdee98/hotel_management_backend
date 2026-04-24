const mongoose = require("mongoose");

const serviceCodeSchema = mongoose.Schema(
{
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true
  },

  code: {
    type: String,
    required: true,
    uppercase: true
  },

  serviceName: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  defaultRate: {
    type: Number
  },

  gst: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("ServiceCode", serviceCodeSchema);