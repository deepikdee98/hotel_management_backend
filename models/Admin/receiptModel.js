const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    receiptNumber: { type: String, required: true },
    receiptType: String,
    customerId: String,
    customerName: String,
    guestName: String,
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    amount: { type: Number, required: true },
    paymentMode: String,
    reference: String,
    paymentDetails: { type: Object, default: {} },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remarks: String,
    status: {
      type: String,
      enum: ["active", "cancelled", "refunded"],
      default: "active",
      index: true,
    },
    businessId: {
      type: String,
      default: "",
      index: true,
    },
  },
  { timestamps: true }
);

receiptSchema.index({ hotelId: 1, createdAt: -1 });
receiptSchema.index({ hotelId: 1, receiptNumber: 1 }, { unique: true });

module.exports = mongoose.model("Receipt", receiptSchema);
