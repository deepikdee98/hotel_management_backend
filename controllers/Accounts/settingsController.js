const asyncHandler = require("express-async-handler");

const AccountSettings = require("../../models/Admin/accountSettingsModel");
const { requireTenant, getSettings } = require("../../services/accountsService");

exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings(requireTenant(req));
  res.json({ success: true, data: settings });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await AccountSettings.findOneAndUpdate({ hotelId: requireTenant(req) }, req.body, { new: true, upsert: true });
  res.json({ success: true, data: settings });
});
