const asyncHandler = require("express-async-handler");

const AdvanceDeposit = require("../../models/Admin/advanceDepositModel");
const { requireTenant, getBusinessId, paginate, nextNumber, getSettings } = require("../../services/accountsService");
const { requireFields, assertPositiveAmount } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listAdvanceDeposits = asyncHandler(async (req, res) => {
  const { items, pagination } = await paginate(AdvanceDeposit, tenantFilter(req, "date", search(req.query.search, ["depositNumber", "guestName", "reference"])), req.query, { sort: { date: -1 } });
  res.json({ success: true, data: { deposits: items, pagination } });
});

exports.createAdvanceDeposit = asyncHandler(async (req, res) => {
  requireFields(req.body, ["guestName", "amount", "paymentMode"]);
  assertPositiveAmount(req.body.amount);
  const hotelId = requireTenant(req);
  const settings = await getSettings(hotelId);
  const deposit = await AdvanceDeposit.create({ ...req.body, hotelId, businessId: getBusinessId(req), depositNumber: req.body.depositNumber || await nextNumber(hotelId, settings.depositPrefix || "ADV-"), balanceAmount: req.body.amount, createdBy: req.user._id });
  res.status(201).json({ success: true, data: deposit });
});
