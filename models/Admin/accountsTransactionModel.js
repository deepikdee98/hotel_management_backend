const mongoose = require("mongoose");

const accountsTransactionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ["Income", "Expense", "Transfer"],
      required: true,
    },
    category: { type: String, required: true },
    subCategory: String,
    description: { type: String, required: true },
    reference: String,
    amount: { type: Number, required: true },
    paymentMode: String,
    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerAccount",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccountsTransaction", accountsTransactionSchema);
