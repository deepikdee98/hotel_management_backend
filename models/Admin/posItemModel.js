const mongoose = require("mongoose");

const posItemSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    category: String,
    code: String,
    price: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PosItem", posItemSchema);
