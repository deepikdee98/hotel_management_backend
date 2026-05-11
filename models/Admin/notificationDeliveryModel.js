const mongoose = require("mongoose");

const notificationDeliverySchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    sourceType: {
      type: String,
      enum: ["admin-notification", "promotion-campaign", "transactional"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ["hotel-user", "guest"],
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    recipientAddress: {
      type: String,
      default: "",
    },
    channel: {
      type: String,
      enum: ["email", "sms", "whatsapp", "inbox"],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed"],
      default: "queued",
    },
    provider: {
      type: String,
      default: "internal",
    },
    providerResponse: {
      type: Object,
      default: {},
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationDelivery", notificationDeliverySchema);
