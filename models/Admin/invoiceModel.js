const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    description: String,
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    invoiceNumber: { type: String, required: true, unique: true },
    folioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      default: null,
      index: true,
    },
    invoiceType: String,
    customerId: String,
    bookingId: String,
    invoiceDate: Date,
    dueDate: Date,
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    notes: String,
    termsAndConditions: String,
    sent: { type: Boolean, default: false },
    sentMeta: { type: Object, default: {} },
    pdfPath: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
