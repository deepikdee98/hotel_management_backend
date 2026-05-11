const mongoose = require("mongoose");

const companyBillingSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    businessId: { type: String, default: "", index: true },
    billNumber: { type: String, required: true },
    companyId: { type: String, required: true, index: true },
    companyName: { type: String, required: true },
    gstin: String,
    billingAddress: String,
    invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
    folioIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Folio" }],
    billDate: { type: Date, default: Date.now, index: true },
    dueDate: Date,
    subtotal: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "sent", "partial", "paid", "overdue", "cancelled"],
      default: "draft",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

companyBillingSchema.index({ hotelId: 1, billDate: -1 });
companyBillingSchema.index({ hotelId: 1, billNumber: 1 }, { unique: true });

module.exports = mongoose.model("CompanyBilling", companyBillingSchema);
