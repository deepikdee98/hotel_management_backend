const mongoose = require("mongoose");

const accountSettingsSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      unique: true,
      index: true,
    },
    gstNumber: String,
    gstRates: { type: Object, default: {} },
    tdsRates: { type: Object, default: {} },
    hsnCodes: { type: Object, default: {} },
    paymentMethods: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccountSettings", accountSettingsSchema);
