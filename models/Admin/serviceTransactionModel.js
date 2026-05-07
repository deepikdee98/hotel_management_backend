const mongoose = require("mongoose");

const serviceTransactionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },
    serviceName: String,
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },
    qty: Number,
    amount: Number,
    total: Number,
    remark: String,
    gstInclusive: Boolean,
  },
  { timestamps: true }
);

serviceTransactionSchema.index({ hotelId: 1, room: 1, createdAt: -1 });

module.exports = mongoose.model("ServiceTransaction", serviceTransactionSchema);