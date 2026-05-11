const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  hotelId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  immutable: true},
  date: {
    type: String, // YYYYMMDD
    required: true,
    index: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true
});

counterSchema.index({ hotelId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Counter", counterSchema);