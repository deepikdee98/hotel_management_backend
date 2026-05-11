const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
    },
    minStock: {
      type: Number,
      default: 0,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Virtual for status
inventorySchema.virtual("status").get(function () {
  if (this.quantity <= 0) return "critical";
  if (this.quantity <= this.minStock * 0.5) return "critical";
  if (this.quantity <= this.minStock) return "low-stock";
  return "in-stock";
});

inventorySchema.set("toJSON", { virtuals: true });
inventorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Inventory", inventorySchema);
