const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    date: { type: Date, default: Date.now },
    category: String,
    subCategory: String,
    description: String,
    amount: { type: Number, required: true },
    paidTo: String,
    paymentMode: String,
    billNumber: String,
    department: String,
    approvedBy: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid", "cancelled"],
      default: "approved",
      index: true,
    },
    taxAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
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
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

expenseSchema.index({ hotelId: 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);
