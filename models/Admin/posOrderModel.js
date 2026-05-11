const mongoose = require("mongoose");

const posOrderItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PosItem",
      required: true,
    },
    name: String,
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const posOrderSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    orderNumber: { type: String, required: true, unique: true },
    folioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      default: null,
    },
    tableNo: String,
    status: {
      type: String,
      enum: ["open", "kot", "served", "closed", "cancelled"],
      default: "open",
    },
    items: [posOrderItemSchema],
    subTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentMode: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PosOrder", posOrderSchema);
