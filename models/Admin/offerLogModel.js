const mongoose = require("mongoose");

const offerLogSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    targetType: {
      type: String,
      enum: ["Specific", "InHouse", "PastGuests", "Upcoming"],
      required: true,
    },
    guestIds: [{ type: String }],
    channel: {
      type: String,
      enum: ["email", "sms", "both", "Email", "SMS", "Both"],
      required: true,
    },
    offer: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "scheduled"],
      default: "sent",
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfferLog", offerLogSchema);
