const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const PromotionCampaign = require("../../models/Admin/promotionCampaignModel");
const NotificationDelivery = require("../../models/Admin/notificationDeliveryModel");
const Guest = require("../../models/Admin/guestModel");
const Checkin = require("../../models/Admin/checkinModel");
const Reservation = require("../../models/Admin/reservationModel");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin"));

const uniqueRecipients = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.recipientId || ""}:${row.recipientAddress}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const resolveRecipients = async (campaign, hotelId) => {
  if (campaign.targetType === "specific") {
    const guests = await Guest.find({ hotelId, _id: { $in: campaign.guestIds || [] } });
    return guests.map((guest) => ({
      recipientId: guest._id,
      recipientAddress: guest.email || guest.phone || "",
    })).filter((row) => row.recipientAddress);
  }

  if (campaign.targetType === "in-house") {
    const checkins = await Checkin.find({ hotelId }).sort({ createdAt: -1 });
    return checkins.map((guest) => ({
      recipientId: guest._id,
      recipientAddress: guest.email || guest.mobileNo || "",
    })).filter((row) => row.recipientAddress);
  }

  if (campaign.targetType === "upcoming") {
    const today = new Date();
    const reservations = await Reservation.find({ hotelId, checkInDate: { $gte: today } });
    return reservations.map((guest) => ({
      recipientId: guest._id,
      recipientAddress: guest.email || guest.phone || "",
    })).filter((row) => row.recipientAddress);
  }

  const guests = await Guest.find({ hotelId });
  return guests.map((guest) => ({
    recipientId: guest._id,
    recipientAddress: guest.email || guest.phone || "",
  })).filter((row) => row.recipientAddress);
};

router.get("/", asyncHandler(async (req, res) => {
  const campaigns = await PromotionCampaign.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { campaigns } });
}));

router.get("/:campaignId", asyncHandler(async (req, res) => {
  const campaign = await PromotionCampaign.findOne({ _id: req.params.campaignId, hotelId: req.user.hotelId });
  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }
  res.json({ success: true, data: campaign });
}));

router.post("/", asyncHandler(async (req, res) => {
  const campaign = await PromotionCampaign.create({
    ...req.body,
    hotelId: req.user.hotelId,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: campaign });
}));

router.patch("/:campaignId", asyncHandler(async (req, res) => {
  const campaign = await PromotionCampaign.findOneAndUpdate(
    { _id: req.params.campaignId, hotelId: req.user.hotelId, status: { $ne: "sent" } },
    req.body,
    { new: true }
  );

  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found or already sent" });
  }

  res.json({ success: true, data: campaign });
}));

router.patch("/:campaignId/send", asyncHandler(async (req, res) => {
  const campaign = await PromotionCampaign.findOne({ _id: req.params.campaignId, hotelId: req.user.hotelId });
  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  if (campaign.status === "cancelled") {
    return res.status(400).json({ success: false, message: "Cancelled campaign cannot be sent" });
  }

  const recipients = uniqueRecipients(await resolveRecipients(campaign, req.user.hotelId));
  const channel = campaign.channel === "both" ? "email" : campaign.channel;

  if (recipients.length) {
    await NotificationDelivery.insertMany(
      recipients.map((recipient) => ({
        hotelId: req.user.hotelId,
        sourceType: "promotion-campaign",
        sourceId: campaign._id,
        recipientType: "guest",
        recipientId: recipient.recipientId,
        recipientAddress: recipient.recipientAddress,
        channel,
        status: "sent",
        provider: "internal",
        sentAt: new Date(),
      }))
    );
  }

  campaign.status = "sent";
  campaign.sentAt = new Date();
  await campaign.save();

  res.json({ success: true, data: { campaign, recipientCount: recipients.length } });
}));

router.patch("/:campaignId/cancel", asyncHandler(async (req, res) => {
  const campaign = await PromotionCampaign.findOneAndUpdate(
    { _id: req.params.campaignId, hotelId: req.user.hotelId, status: { $ne: "sent" } },
    { status: "cancelled" },
    { new: true }
  );

  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found or already sent" });
  }

  res.json({ success: true, data: campaign });
}));

router.get("/:campaignId/deliveries", asyncHandler(async (req, res) => {
  const deliveries = await NotificationDelivery.find({
    hotelId: req.user.hotelId,
    sourceType: "promotion-campaign",
    sourceId: req.params.campaignId,
  }).sort({ createdAt: -1 });

  res.json({ success: true, data: { deliveries } });
}));

module.exports = router;
