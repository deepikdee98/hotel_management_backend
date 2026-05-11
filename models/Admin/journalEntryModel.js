const mongoose = require("mongoose");

const journalLineSchema = new mongoose.Schema(
  {
    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerAccount",
      required: true,
    },
    accountCode: String,
    accountName: String,
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: String,
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    businessId: { type: String, default: "", index: true },
    journalNumber: { type: String, required: true },
    date: { type: Date, default: Date.now, index: true },
    narration: { type: String, required: true },
    reference: String,
    status: {
      type: String,
      enum: ["draft", "posted", "cancelled"],
      default: "posted",
      index: true,
    },
    lines: [journalLineSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    postedAt: Date,
  },
  { timestamps: true }
);

journalEntrySchema.index({ hotelId: 1, date: -1 });
journalEntrySchema.index({ hotelId: 1, journalNumber: 1 }, { unique: true });

module.exports = mongoose.model("JournalEntry", journalEntrySchema);
