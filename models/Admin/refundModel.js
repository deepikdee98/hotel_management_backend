const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    businessId: { type: String, default: "", index: true },
    refundNumber: { type: String, required: true },
    refundType: {
      type: String,
      enum: ["guest_refund", "deposit_refund", "paidout", "invoice_refund", "other"],
      default: "guest_refund",
    },
    guestName: String,
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: "Receipt", default: null },
    advanceDepositId: { type: mongoose.Schema.Types.ObjectId, ref: "AdvanceDeposit", default: null },
    folioId: { type: mongoose.Schema.Types.ObjectId, ref: "Folio", default: null },
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: String,
    reference: String,
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "cancelled"],
      default: "paid",
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

refundSchema.index({ hotelId: 1, date: -1 });
refundSchema.index({ hotelId: 1, refundNumber: 1 }, { unique: true });

module.exports = mongoose.model("Refund", refundSchema);
