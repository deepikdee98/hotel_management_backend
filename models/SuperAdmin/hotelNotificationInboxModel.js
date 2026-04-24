const mongoose = require("mongoose");

const hotelNotificationInboxSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminNotification",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

hotelNotificationInboxSchema.index({ hotelId: 1, notificationId: 1 }, { unique: true });

module.exports = mongoose.model("HotelNotificationInbox", hotelNotificationInboxSchema);
