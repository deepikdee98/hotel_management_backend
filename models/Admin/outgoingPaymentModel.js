const mongoose = require("mongoose");

const outgoingPaymentSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("OutgoingPayment", outgoingPaymentSchema);
