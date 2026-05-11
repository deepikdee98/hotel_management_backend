const mongoose = require("mongoose");

const outgoingPaymentSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    paymentType: String,
    vendorId: String,
    vendorName: String,
    billNumber: String,
    billDate: Date,
    amount: { type: Number, required: true },
    paymentMode: String,
    bankAccount: String,
    chequeNumber: String,
    utrNumber: String,
    paymentDate: Date,
    category: String,
    description: String,
    tdsApplicable: { type: Boolean, default: false },
    tdsRate: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    netPayment: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
      index: true,
    },
    direction: {
      type: String,
      enum: ["outgoing", "incoming"],
      default: "outgoing",
      index: true,
    },
    businessId: {
      type: String,
      default: "",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

outgoingPaymentSchema.index({ hotelId: 1, paymentDate: -1, createdAt: -1 });

module.exports = mongoose.model("OutgoingPayment", outgoingPaymentSchema);
