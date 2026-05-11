const mongoose = require("mongoose");

const accountsTransactionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ["Income", "Expense", "Transfer", "Refund", "Journal"],
      required: true,
    },
    category: { type: String, required: true },
    subCategory: String,
    description: { type: String, required: true },
    reference: String,
    amount: { type: Number, required: true },
    paymentMode: String,
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "reversed"],
      default: "completed",
      index: true,
    },
    sourceModule: {
      type: String,
      default: "accounts",
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    businessId: {
      type: String,
      default: "",
      index: true,
    },
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

accountsTransactionSchema.index({ hotelId: 1, date: -1, createdAt: -1 });
accountsTransactionSchema.index({ hotelId: 1, type: 1, category: 1 });

module.exports = mongoose.model("AccountsTransaction", accountsTransactionSchema);
