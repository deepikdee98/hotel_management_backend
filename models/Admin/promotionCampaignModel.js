const mongoose = require("mongoose");

const promotionCampaignSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    channel: {
      type: String,
      enum: ["email", "sms", "both", "whatsapp"],
      default: "email",
    },
    targetType: {
      type: String,
      enum: ["specific", "in-house", "past-guests", "upcoming"],
      default: "specific",
    },
    guestIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
    }],
    audienceFilter: {
      type: Object,
      default: {},
    },
    offer: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "cancelled"],
      default: "draft",
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PromotionCampaign", promotionCampaignSchema);
