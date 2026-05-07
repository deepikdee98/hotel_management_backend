const mongoose = require("mongoose");

const companyLedgerSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    gstin: {
      type: String,
      default: "",
      trim: true,
    },
    billingAddress: {
      type: String,
      default: "",
      trim: true,
    },
    folioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyLedger", companyLedgerSchema);
