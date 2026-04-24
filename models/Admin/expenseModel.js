const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
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
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
