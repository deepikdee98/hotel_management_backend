const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const ModuleCatalog = require("../../models/SuperAdmin/moduleCatalogModel");
const HotelModuleSubscription = require("../../models/SuperAdmin/hotelModuleSubscriptionModel");
const ModuleRequest = require("../../models/SuperAdmin/moduleRequestModel");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.get("/", asyncHandler(async (req, res) => {
  const [modules, subscriptions, pendingRequests] = await Promise.all([
    ModuleCatalog.find({ isActive: true }).sort({ name: 1 }),
    HotelModuleSubscription.find({ hotelId: req.user.hotelId }),
    ModuleRequest.find({ hotelId: req.user.hotelId, status: "pending" }),
  ]);

  const subscriptionMap = new Map(subscriptions.map((item) => [item.moduleCode, item]));
  const requestMap = new Map(pendingRequests.map((item) => [item.requestedModuleCode, item]));

  const result = modules.map((moduleDoc) => ({
    ...moduleDoc.toObject(),
    enabled: subscriptionMap.get(moduleDoc.code)?.status === "active",
    requested: requestMap.has(moduleDoc.code),
    subscription: subscriptionMap.get(moduleDoc.code) || null,
  }));

  res.json({ success: true, data: { modules: result } });
}));

router.get("/enabled", asyncHandler(async (req, res) => {
  const subscriptions = await HotelModuleSubscription.find({ hotelId: req.user.hotelId, status: "active" }).sort({ createdAt: -1 });
  res.json({ success: true, data: { subscriptions } });
}));

module.exports = router;
