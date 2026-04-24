const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    receiptNumber: { type: String, required: true, unique: true },
    receiptType: String,
    customerId: String,
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    amount: { type: Number, required: true },
    paymentMode: String,
    paymentDetails: { type: Object, default: {} },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remarks: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
