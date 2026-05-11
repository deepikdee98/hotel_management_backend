const mongoose = require("mongoose");

const accountSettingsSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      unique: true,
      index: true,
    immutable: true},
    gstNumber: String,
    gstRates: { type: Object, default: {} },
    tdsRates: { type: Object, default: {} },
    hsnCodes: { type: Object, default: {} },
    panNumber: String,
    tanNumber: String,
    stateCode: String,
    financialYearStart: { type: String, default: "april" },
    currency: { type: String, default: "inr" },
    invoicePrefix: { type: String, default: "INV-" },
    receiptPrefix: { type: String, default: "RCP-" },
    paymentPrefix: { type: String, default: "PAY-" },
    depositPrefix: { type: String, default: "ADV-" },
    refundPrefix: { type: String, default: "REF-" },
    automation: {
      autoGenerateInvoiceOnCheckout: { type: Boolean, default: true },
      sendInvoiceViaEmail: { type: Boolean, default: false },
      roundOffAmounts: { type: Boolean, default: false },
    },
    paymentMethods: { type: Array, default: [] },
    taxRates: { type: Array, default: [] },
    expenseCategories: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccountSettings", accountSettingsSchema);
