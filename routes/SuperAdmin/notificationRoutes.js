const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const AdminNotification = require("../../models/SuperAdmin/adminNotificationModel");
const HotelNotificationInbox = require("../../models/SuperAdmin/hotelNotificationInboxModel");
const Hotel = require("../../models/SuperAdmin/hotelModel");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const resolveTargetHotels = async (payload) => {
  if (payload.audience === "selected-hotels") {
    return payload.audienceDetails?.hotelIds || [];
  }

  if (payload.audience === "module-hotels") {
    const moduleCodes = payload.audienceDetails?.moduleCodes || [];
    const hotels = await Hotel.find({ modules: { $in: moduleCodes } }).select("_id");
    return hotels.map((hotel) => hotel._id);
  }

  const hotels = await Hotel.find({ status: { $ne: "suspended" } }).select("_id");
  return hotels.map((hotel) => hotel._id);
};

router.use(protect, authorizeRoles("superadmin"));

router.get("/", asyncHandler(async (req, res) => {
  const notifications = await AdminNotification.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { notifications } });
}));

router.get("/:notificationId", asyncHandler(async (req, res) => {
  const notification = await AdminNotification.findById(req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }
  res.json({ success: true, data: notification });
}));

router.post("/", asyncHandler(async (req, res) => {
  const notification = await AdminNotification.create({
    ...req.body,
    createdBy: req.user._id,
  });

  const hotelIds = await resolveTargetHotels(notification);
  if (hotelIds.length) {
    await HotelNotificationInbox.insertMany(
      hotelIds.map((hotelId) => ({ hotelId, notificationId: notification._id })),
      { ordered: false }
    ).catch(() => null);
  }

  res.status(201).json({ success: true, data: { notification, hotelCount: hotelIds.length } });
}));

router.patch("/:notificationId", asyncHandler(async (req, res) => {
  const notification = await AdminNotification.findByIdAndUpdate(
    req.params.notificationId,
    req.body,
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.json({ success: true, data: notification });
}));

router.delete("/:notificationId", asyncHandler(async (req, res) => {
  const notification = await AdminNotification.findById(req.params.notificationId);
  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  await HotelNotificationInbox.deleteMany({ notificationId: notification._id });
  await notification.deleteOne();
  res.json({ success: true, message: "Notification deleted" });
}));

module.exports = router;
