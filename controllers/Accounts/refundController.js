const asyncHandler = require("express-async-handler");

const Refund = require("../../models/Admin/refundModel");
const { requireTenant, getBusinessId, paginate, nextNumber, getSettings } = require("../../services/accountsService");
const { requireFields, assertPositiveAmount } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listRefunds = asyncHandler(async (req, res) => {
  const { items, pagination } = await paginate(Refund, tenantFilter(req, "date", search(req.query.search, ["refundNumber", "guestName", "reason", "reference"])), req.query, { sort: { date: -1 } });
  res.json({ success: true, data: { refunds: items, pagination } });
});

exports.createRefund = asyncHandler(async (req, res) => {
  requireFields(req.body, ["amount", "reason"]);
  assertPositiveAmount(req.body.amount);
  const hotelId = requireTenant(req);
  const settings = await getSettings(hotelId);
  const refund = await Refund.create({ ...req.body, hotelId, businessId: getBusinessId(req), refundNumber: req.body.refundNumber || await nextNumber(hotelId, settings.refundPrefix || "REF-"), createdBy: req.user._id });
  res.status(201).json({ success: true, data: refund });
});
