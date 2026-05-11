const asyncHandler = require("express-async-handler");

const OutgoingPayment = require("../../models/Admin/outgoingPaymentModel");
const { requireTenant, getBusinessId, paginate, audit } = require("../../services/accountsService");
const { requireFields, assertPositiveAmount } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listPayments = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req, "paymentDate", search(req.query.search, ["vendorName", "description", "billNumber", "utrNumber"]));
  if (req.query.direction) filter.direction = req.query.direction;
  const { items, pagination } = await paginate(OutgoingPayment, filter, req.query, { sort: { paymentDate: -1, createdAt: -1 } });
  res.json({ success: true, data: { payments: items, pagination } });
});

exports.createPayment = asyncHandler(async (req, res) => {
  requireFields(req.body, ["amount", "paymentMode"]);
  assertPositiveAmount(req.body.amount);
  const payment = await OutgoingPayment.create({
    ...req.body,
    hotelId: requireTenant(req),
    businessId: getBusinessId(req),
    paymentDate: req.body.paymentDate || req.body.date || new Date(),
    createdBy: req.user._id,
  });
  await audit(req, "accounts.payment.create", "Payment recorded", { paymentId: payment._id });
  res.status(201).json({ success: true, data: payment });
});
