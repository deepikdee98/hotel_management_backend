const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const ModuleCatalog = require("../../models/SuperAdmin/moduleCatalogModel");
const HotelModuleSubscription = require("../../models/SuperAdmin/hotelModuleSubscriptionModel");
const Hotel = require("../../models/SuperAdmin/hotelModel");
const User = require("../../models/userModel");
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
  const modules = await ModuleCatalog.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { modules } });
}));

router.post("/", asyncHandler(async (req, res) => {
  const moduleDoc = await ModuleCatalog.create({
    ...req.body,
    code: String(req.body.code || "").toLowerCase(),
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: moduleDoc });
}));

router.put("/:moduleId", asyncHandler(async (req, res) => {
  const moduleDoc = await ModuleCatalog.findByIdAndUpdate(
    req.params.moduleId,
    { ...req.body, updatedBy: req.user._id },
    { new: true }
  );

  if (!moduleDoc) {
    return res.status(404).json({ success: false, message: "Module not found" });
  }

  res.json({ success: true, data: moduleDoc });
}));

router.patch("/:moduleId/status", asyncHandler(async (req, res) => {
  const moduleDoc = await ModuleCatalog.findByIdAndUpdate(
    req.params.moduleId,
    { isActive: !!req.body.isActive, updatedBy: req.user._id },
    { new: true }
  );

  if (!moduleDoc) {
    return res.status(404).json({ success: false, message: "Module not found" });
  }

  res.json({ success: true, data: moduleDoc });
}));

router.get("/hotels/:hotelId", asyncHandler(async (req, res) => {
  const subscriptions = await HotelModuleSubscription.find({ hotelId: req.params.hotelId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { subscriptions } });
}));

router.patch("/hotels/:hotelId/:moduleCode/enable", asyncHandler(async (req, res) => {
  const moduleCode = String(req.params.moduleCode).toLowerCase();
  const moduleDoc = await ModuleCatalog.findOne({ code: moduleCode, isActive: true });
  if (!moduleDoc) {
    return res.status(404).json({ success: false, message: "Module not found or inactive" });
  }

  const subscription = await HotelModuleSubscription.findOneAndUpdate(
    { hotelId: req.params.hotelId, moduleCode },
    {
      status: "active",
      activationSource: req.body.activationSource || "manual",
      enabledBy: req.user._id,
      enabledAt: new Date(),
      disabledBy: null,
      disabledAt: null,
      notes: req.body.notes || "",
    },
    { upsert: true, new: true }
  );

  const modules = await syncHotelModules(req.params.hotelId);
  await User.updateMany(
    { hotelId: req.params.hotelId, role: "hoteladmin" },
    { $addToSet: { modules: moduleCode } }
  );

  res.json({ success: true, data: { subscription, modules } });
}));

router.patch("/hotels/:hotelId/:moduleCode/disable", asyncHandler(async (req, res) => {
  const moduleCode = String(req.params.moduleCode).toLowerCase();
  const subscription = await HotelModuleSubscription.findOneAndUpdate(
    { hotelId: req.params.hotelId, moduleCode },
    {
      status: "inactive",
      disabledBy: req.user._id,
      disabledAt: new Date(),
      notes: req.body.notes || "",
    },
    { new: true }
  );

  if (!subscription) {
    return res.status(404).json({ success: false, message: "Subscription not found" });
  }

  const modules = await syncHotelModules(req.params.hotelId);
  res.json({ success: true, data: { subscription, modules } });
}));

module.exports = router;
