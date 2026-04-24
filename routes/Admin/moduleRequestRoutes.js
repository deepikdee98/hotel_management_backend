const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const ModuleCatalog = require("../../models/SuperAdmin/moduleCatalogModel");
const HotelModuleSubscription = require("../../models/SuperAdmin/hotelModuleSubscriptionModel");
const ModuleRequest = require("../../models/SuperAdmin/moduleRequestModel");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin"));

router.get("/", asyncHandler(async (req, res) => {
  const requests = await ModuleRequest.find({ hotelId: req.user.hotelId })
    .populate("requestedBy", "username email")
    .populate("reviewedBy", "username email")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { requests } });
}));

router.get("/:requestId", asyncHandler(async (req, res) => {
  const request = await ModuleRequest.findOne({ _id: req.params.requestId, hotelId: req.user.hotelId })
    .populate("requestedBy", "username email")
    .populate("reviewedBy", "username email");

  if (!request) {
    return res.status(404).json({ success: false, message: "Request not found" });
  }

  res.json({ success: true, data: request });
}));

router.post("/", asyncHandler(async (req, res) => {
  const requestedModuleCode = String(req.body.requestedModuleCode || "").toLowerCase();
  if (!requestedModuleCode) {
    return res.status(400).json({ success: false, message: "requestedModuleCode is required" });
  }

  const moduleDoc = await ModuleCatalog.findOne({ code: requestedModuleCode, isActive: true, isRequestable: true });
  if (!moduleDoc) {
    return res.status(400).json({ success: false, message: "Module is unavailable for request" });
  }

  const activeSubscription = await HotelModuleSubscription.findOne({
    hotelId: req.user.hotelId,
    moduleCode: requestedModuleCode,
    status: "active",
  });
  if (activeSubscription) {
    return res.status(400).json({ success: false, message: "Module already enabled for this hotel" });
  }

  const pendingRequest = await ModuleRequest.findOne({
    hotelId: req.user.hotelId,
    requestedModuleCode,
    status: "pending",
  });
  if (pendingRequest) {
    return res.status(409).json({ success: false, message: "A pending request already exists for this module" });
  }

  const request = await ModuleRequest.create({
    hotelId: req.user.hotelId,
    requestedModuleCode,
    requestedBy: req.user._id,
    justification: req.body.justification || "",
  });

  res.status(201).json({ success: true, data: request });
}));

router.delete("/:requestId", asyncHandler(async (req, res) => {
  const request = await ModuleRequest.findOne({ _id: req.params.requestId, hotelId: req.user.hotelId });
  if (!request) {
    return res.status(404).json({ success: false, message: "Request not found" });
  }

  if (request.status !== "pending") {
    return res.status(400).json({ success: false, message: "Only pending requests can be cancelled" });
  }

  request.status = "cancelled";
  await request.save();
  res.json({ success: true, data: request });
}));

module.exports = router;
