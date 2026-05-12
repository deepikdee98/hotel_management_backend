const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"],
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "hoteladmin", "staff"],
      required: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
     modules: [
      {
        type: String,
        enum: [
          "front-office",
          "point-of-sale",
          "housekeeping",
          "accounts",
          "inventory",
          "reports",
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    phone: {
      type: String,
    },

    timezone: {
      type: String,
    },

    avatar: {
      type: String,
    },
    appearance: {
      theme: {
        type: String,
        enum: ["dark", "light", "system"],
        default: "system"
      },
      language: {
        type: String,
        enum: ["en-US", "en-UK", "es", "fr", "de"],
        default: "en-US"
      },
      dateFormat: {
        type: String,
        enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"],
        default: "MM/DD/YYYY"
      }
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    security: {
      twoFactorEnabled: {
        type: Boolean,
        default: false
      },
      sessionTimeout: {
        type: Number,
        default: 30   
      }
    }
  },
  { timestamps: true }
);

userSchema.index({ hotelId: 1, username: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
