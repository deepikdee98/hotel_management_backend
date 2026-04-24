const mongoose = require("mongoose");

const folioTransactionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    folioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      required: true,
      index: true,
    },
    checkin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checkin",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "room-tariff",
        "service-charge",
        "payment",
        "discount",
        "settlement",
        "paidout",
        "refund",
      ],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

folioTransactionSchema.index({ hotelId: 1, folioId: 1, date: 1 });

module.exports = mongoose.model("FolioTransaction", folioTransactionSchema);
