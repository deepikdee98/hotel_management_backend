const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const HotelNotificationInbox = require("../../models/SuperAdmin/hotelNotificationInboxModel");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.get("/", asyncHandler(async (req, res) => {
  const filter = { hotelId: req.user.hotelId, archived: false };
  const inbox = await HotelNotificationInbox.find(filter)
    .populate("notificationId")
    .sort({ createdAt: -1 });

  const notifications = inbox
    .filter((item) => item.notificationId)
    .map((item) => ({
      inboxId: item._id,
      isRead: item.isRead,
      readAt: item.readAt,
      archived: item.archived,
      notification: item.notificationId,
    }));

  res.json({ success: true, data: { notifications } });
}));

router.get("/:notificationId", asyncHandler(async (req, res) => {
  const inboxItem = await HotelNotificationInbox.findOne({
    hotelId: req.user.hotelId,
    notificationId: req.params.notificationId,
  }).populate("notificationId");

  if (!inboxItem || !inboxItem.notificationId) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.json({
    success: true,
    data: {
      inboxId: inboxItem._id,
      isRead: inboxItem.isRead,
      readAt: inboxItem.readAt,
      archived: inboxItem.archived,
      notification: inboxItem.notificationId,
    },
  });
}));

router.patch("/:notificationId/read", asyncHandler(async (req, res) => {
  const inboxItem = await HotelNotificationInbox.findOneAndUpdate(
    { hotelId: req.user.hotelId, notificationId: req.params.notificationId },
    { isRead: true, readAt: new Date() },
    { new: true }
  ).populate("notificationId");

  if (!inboxItem) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.json({ success: true, data: inboxItem });
}));

router.patch("/:notificationId/archive", asyncHandler(async (req, res) => {
  const inboxItem = await HotelNotificationInbox.findOneAndUpdate(
    { hotelId: req.user.hotelId, notificationId: req.params.notificationId },
    { archived: true },
    { new: true }
  );

  if (!inboxItem) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.json({ success: true, data: inboxItem });
}));

module.exports = router;
