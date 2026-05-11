const mongoose = require("mongoose");

const financialYearSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    businessId: { type: String, default: "", index: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["open", "closed", "locked"],
      default: "open",
      index: true,
    },
    closedAt: Date,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: String,
  },
  { timestamps: true }
);

financialYearSchema.index({ hotelId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("FinancialYear", financialYearSchema);
