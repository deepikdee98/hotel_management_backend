const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const ModuleRequest = require("../../models/SuperAdmin/moduleRequestModel");
const ModuleCatalog = require("../../models/SuperAdmin/moduleCatalogModel");
const HotelModuleSubscription = require("../../models/SuperAdmin/hotelModuleSubscriptionModel");
const AdminNotification = require("../../models/SuperAdmin/adminNotificationModel");
const HotelNotificationInbox = require("../../models/SuperAdmin/hotelNotificationInboxModel");
const Hotel = require("../../models/SuperAdmin/hotelModel");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const syncHotelModules = async (hotelId) => {
  const subscriptions = await HotelModuleSubscription.find({ hotelId, status: "active" });
  const modules = subscriptions.map((item) => item.moduleCode);
  await Hotel.findByIdAndUpdate(hotelId, { modules });
  return modules;
};

router.use(protect, authorizeRoles("superadmin"));

router.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  const requests = await ModuleRequest.find(filter)
    .populate("hotelId", "name email")
    .populate("requestedBy", "username email")
    .populate("reviewedBy", "username email")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { requests } });
}));

router.get("/:requestId", asyncHandler(async (req, res) => {
  const request = await ModuleRequest.findById(req.params.requestId)
    .populate("hotelId", "name email")
    .populate("requestedBy", "username email")
    .populate("reviewedBy", "username email");

  if (!request) {
    return res.status(404).json({ success: false, message: "Request not found" });
  }

  res.json({ success: true, data: request });
}));

router.patch("/:requestId/approve", asyncHandler(async (req, res) => {
  const request = await ModuleRequest.findById(req.params.requestId);
  if (!request) {
    return res.status(404).json({ success: false, message: "Request not found" });
  }

  if (request.status !== "pending") {
    return res.status(400).json({ success: false, message: "Only pending requests can be approved" });
  }

  const moduleDoc = await ModuleCatalog.findOne({ code: request.requestedModuleCode, isActive: true });
  if (!moduleDoc) {
    return res.status(404).json({ success: false, message: "Requested module is unavailable" });
  }

  request.status = "approved";
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.adminNotes = req.body.adminNotes || "";
  await request.save();

  const subscription = await HotelModuleSubscription.findOneAndUpdate(
    { hotelId: request.hotelId, moduleCode: request.requestedModuleCode },
    {
      status: "active",
      activationSource: "request-approved",
      enabledBy: req.user._id,
      enabledAt: new Date(),
      disabledBy: null,
      disabledAt: null,
      notes: request.adminNotes,
    },
    { upsert: true, new: true }
  );

  await syncHotelModules(request.hotelId);

  const notification = await AdminNotification.create({
    title: `Module approved: ${request.requestedModuleCode}`,
    message: req.body.adminNotes || `Your request for ${request.requestedModuleCode} has been approved.`,
    type: "module-update",
    priority: "medium",
    audience: "selected-hotels",
    audienceDetails: { allHotels: false, hotelIds: [request.hotelId], moduleCodes: [], planCodes: [] },
    relatedModuleCode: request.requestedModuleCode,
    publishAt: new Date(),
    createdBy: req.user._id,
  });

  await HotelNotificationInbox.findOneAndUpdate(
    { hotelId: request.hotelId, notificationId: notification._id },
    { hotelId: request.hotelId, notificationId: notification._id },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: { request, subscription, notification } });
}));

router.patch("/:requestId/reject", asyncHandler(async (req, res) => {
  const request = await ModuleRequest.findById(req.params.requestId);
  if (!request) {
    return res.status(404).json({ success: false, message: "Request not found" });
  }

  if (request.status !== "pending") {
    return res.status(400).json({ success: false, message: "Only pending requests can be rejected" });
  }

  request.status = "rejected";
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  request.adminNotes = req.body.adminNotes || "";
  await request.save();

  const notification = await AdminNotification.create({
    title: `Module request rejected: ${request.requestedModuleCode}`,
    message: req.body.adminNotes || `Your request for ${request.requestedModuleCode} has been rejected.`,
    type: "module-update",
    priority: "medium",
    audience: "selected-hotels",
    audienceDetails: { allHotels: false, hotelIds: [request.hotelId], moduleCodes: [], planCodes: [] },
    relatedModuleCode: request.requestedModuleCode,
    publishAt: new Date(),
    createdBy: req.user._id,
  });

  await HotelNotificationInbox.findOneAndUpdate(
    { hotelId: request.hotelId, notificationId: notification._id },
    { hotelId: request.hotelId, notificationId: notification._id },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: { request, notification } });
}));

module.exports = router;
