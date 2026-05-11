const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
    immutable: true},
    invoiceNumber: { type: String, required: true },
    folioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      default: null,
      index: true,
    },
    invoiceType: String,
    customerId: String,
    customerName: String,
    guestName: String,
    room: String,
    checkIn: Date,
    checkOut: Date,
    companyId: String,
    companyName: String,
    travelAgentId: String,
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
    status: {
      type: String,
      enum: ["draft", "pending", "partial", "paid", "overdue", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    billingType: {
      type: String,
      enum: ["guest", "split", "company", "travel_agent"],
      default: "guest",
      index: true,
    },
    splitBilling: {
      type: Object,
      default: {},
    },
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
  },
  { timestamps: true }
);

invoiceSchema.index({ hotelId: 1, invoiceDate: -1 });
invoiceSchema.index({ hotelId: 1, status: 1 });
invoiceSchema.index({ hotelId: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
