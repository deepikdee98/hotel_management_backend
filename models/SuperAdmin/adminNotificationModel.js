const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["module-update", "new-feature", "maintenance", "pricing", "policy", "general"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    audience: {
      type: String,
      enum: ["all-hotels", "selected-hotels", "module-hotels"],
      default: "all-hotels",
    },
    audienceDetails: {
      allHotels: {
        type: Boolean,
        default: false,
      },
      hotelIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hotel",
      }],
      moduleCodes: [{ type: String }],
      planCodes: [{ type: String }],
    },
    relatedModuleCode: {
      type: String,
      default: "",
    },
    publishAt: {
      type: Date,
      default: Date.now,
    },
    expireAt: {
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

adminNotificationSchema.index({ createdAt: -1 });
adminNotificationSchema.index({ publishAt: -1, expireAt: 1 });
adminNotificationSchema.index({ type: 1, priority: 1, createdAt: -1 });
adminNotificationSchema.index({ "audienceDetails.hotelIds": 1 });
adminNotificationSchema.index({ "audienceDetails.moduleCodes": 1 });

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);
