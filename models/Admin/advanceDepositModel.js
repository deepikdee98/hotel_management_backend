const mongoose = require("mongoose");

const advanceDepositSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    businessId: { type: String, default: "", index: true },
    depositNumber: { type: String, required: true },
    guestName: { type: String, required: true },
    guestPhone: String,
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", default: null },
    folioId: { type: mongoose.Schema.Types.ObjectId, ref: "Folio", default: null },
    companyId: String,
    date: { type: Date, default: Date.now, index: true },
    amount: { type: Number, required: true, min: 0 },
    appliedAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentMode: String,
    reference: String,
    status: {
      type: String,
      enum: ["open", "applied", "partially_refunded", "refunded", "cancelled"],
      default: "open",
      index: true,
    },
    remarks: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

advanceDepositSchema.index({ hotelId: 1, date: -1 });
advanceDepositSchema.index({ hotelId: 1, depositNumber: 1 }, { unique: true });

module.exports = mongoose.model("AdvanceDeposit", advanceDepositSchema);
