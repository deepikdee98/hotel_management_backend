const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authorizeModule } = require("../middleware/moduleMiddleware");

const Room = require("../models/Admin/roomModel");
const HousekeepingTask = require("../models/Admin/housekeepingTaskModel");
const User = require("../models/userModel");

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"), authorizeModule("housekeeping"));

router.get("/staff", asyncHandler(async (req, res) => {
  const staff = await User.find({
    hotelId: req.user.hotelId,
    role: "staff",
    isActive: { $ne: false },
    modules: "housekeeping",
  })
    .select("username email role hotelId modules isActive createdAt")
    .sort({ username: 1 });

  res.json({ success: true, data: { staff } });
}));

router.get("/rooms", asyncHandler(async (req, res) => {
  const filter = { hotelId: req.user.hotelId };
  if (req.query.hkStatus) {
    filter.hkStatus = req.query.hkStatus;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const rooms = await Room.find(filter)
    .populate("roomType", "name code")
    .sort({ roomNumber: 1 });

  res.json({ success: true, data: { rooms } });
}));

router.patch("/rooms/:roomId/status", asyncHandler(async (req, res) => {
  const payload = {};
  if (req.body.hkStatus) {
    payload.hkStatus = req.body.hkStatus;
  }
  if (req.body.status) {
    payload.status = req.body.status;
  }

  const room = await Room.findOneAndUpdate(
    { _id: req.params.roomId, hotelId: req.user.hotelId },
    payload,
    { new: true }
  );

  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  res.json({ success: true, data: room });
}));

router.get("/tasks", asyncHandler(async (req, res) => {
  const filter = { hotelId: req.user.hotelId };
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  const tasks = await HousekeepingTask.find(filter)
    .populate("roomId", "roomNumber floor hkStatus status")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { tasks } });
}));

router.post("/tasks", asyncHandler(async (req, res) => {
  const room = await Room.findOne({ _id: req.body.roomId, hotelId: req.user.hotelId });
  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  const task = await HousekeepingTask.create({
    hotelId: req.user.hotelId,
    roomId: req.body.roomId,
    taskType: req.body.taskType,
    priority: req.body.priority,
    assignedTo: req.body.assignedTo,
    notes: req.body.notes,
  });

  res.status(201).json({ success: true, data: task });
}));

router.patch("/tasks/:taskId", asyncHandler(async (req, res) => {
  const task = await HousekeepingTask.findOne({ _id: req.params.taskId, hotelId: req.user.hotelId });
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }

  if (req.body.status) {
    task.status = req.body.status;
    if (req.body.status === "completed") {
      task.completedAt = new Date();

      const room = await Room.findById(task.roomId);
      if (room) {
        room.hkStatus = "clean";
        await room.save();
      }
    }
  }

  if (req.body.assignedTo !== undefined) {
    task.assignedTo = req.body.assignedTo;
  }
  if (req.body.notes !== undefined) {
    task.notes = req.body.notes;
  }

  await task.save();

  res.json({ success: true, data: task });
}));

module.exports = router;
