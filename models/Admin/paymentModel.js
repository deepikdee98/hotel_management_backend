const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    folioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      required: true,
      index: true,
    },
    payerName: {
      type: String,
      default: "Guest",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paid: {
      type: Number,
      required: true,
      min: 0,
    },
    mode: {
      type: String,
      enum: ["cash", "upi", "card"],
      required: true,
    },
    refund: {
      type: Number,
      default: 0,
      min: 0,
    },
    reference: {
      type: String,
      default: "",
    },
    billingType: {
      type: String,
      enum: ["full", "split", "company"],
      default: "full",
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ hotelId: 1, folioId: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
