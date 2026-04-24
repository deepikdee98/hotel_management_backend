const mongoose = require("mongoose");

const roomTypeSchema = mongoose.Schema(
{
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hotel",
    required: true
  },

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
    type: String
  },

  baseRate: {
    type: Number,
    required: true
  },

  maxOccupancy: {
    type: Number,
    required: true
  },


  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active"
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("RoomType", roomTypeSchema);