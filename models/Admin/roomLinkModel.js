const mongoose = require("mongoose");

const roomLinkSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    masterFolioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folio",
      required: true,
      index: true,
    },
    linkedFolioIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folio",
      },
    ],
    billingInstructions: String,
    linkType: {
      type: String,
      enum: ["Full", "RoomOnly", "Extras Only"],
      default: "Full",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

roomLinkSchema.index({ hotelId: 1, masterFolioId: 1, isActive: 1 });

module.exports = mongoose.model("RoomLink", roomLinkSchema);
