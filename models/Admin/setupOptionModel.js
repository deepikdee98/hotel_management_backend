const mongoose = require("mongoose");

const setupOptionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedValue: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

setupOptionSchema.pre("validate", function normalizeSetupOption() {
  if (this.hotelId != null) {
    this.hotelId = String(this.hotelId).trim();
  }
  if (this.value != null) {
    this.value = String(this.value).trim();
    this.normalizedValue = this.value.toLowerCase();
  }
  if (this.type != null) {
    this.type = String(this.type).trim();
  }
});

setupOptionSchema.index(
  { hotelId: 1, type: 1, normalizedValue: 1 },
  { unique: true }
);
setupOptionSchema.index({ hotelId: 1, module: 1, type: 1, isActive: 1 });

module.exports = mongoose.model("SetupOption", setupOptionSchema);
