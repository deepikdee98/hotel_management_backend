const mongoose = require("mongoose");

const ledgerEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    description: String,
    reference: String,
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  { _id: false }
);

const ledgerAccountSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerAccount",
      default: null,
    },
    balance: { type: Number, default: 0 },
    entries: [ledgerEntrySchema],
  },
  { timestamps: true }
);

ledgerAccountSchema.index({ hotelId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("LedgerAccount", ledgerAccountSchema);
