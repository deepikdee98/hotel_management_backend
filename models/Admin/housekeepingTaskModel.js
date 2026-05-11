const mongoose = require("mongoose");

const housekeepingTaskSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    immutable: true},
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    taskType: {
      type: String,
      enum: ["checkout", "stayover", "deep-clean", "turndown", "inspection", "maintenance"],
      default: "checkout",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
    assignedTo: String,
    notes: String,
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("HousekeepingTask", housekeepingTaskSchema);
