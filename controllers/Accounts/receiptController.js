const asyncHandler = require("express-async-handler");

const Invoice = require("../../models/Admin/invoiceModel");
const Receipt = require("../../models/Admin/receiptModel");
const { toNum, requireTenant, getBusinessId, paginate, nextNumber, invoiceStatus, getSettings, audit } = require("../../services/accountsService");
const { requireFields, assertPositiveAmount } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listReceipts = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req, "createdAt", search(req.query.search, ["receiptNumber", "guestName", "customerName", "reference"]));
  const { items, pagination } = await paginate(Receipt, filter, req.query, { sort: { createdAt: -1 }, populate: "invoiceId receivedBy" });
  res.json({ success: true, data: { receipts: items, pagination } });
});

exports.createReceipt = asyncHandler(async (req, res) => {
  requireFields(req.body, ["amount", "paymentMode"]);
  assertPositiveAmount(req.body.amount);
  const hotelId = requireTenant(req);
  const businessId = getBusinessId(req);
  const settings = await getSettings(hotelId);
  const receipt = await Receipt.create({
    ...req.body,
    hotelId,
    businessId,
    receiptNumber: req.body.receiptNumber || await nextNumber(hotelId, settings.receiptPrefix || "RCP-"),
    receivedBy: req.user._id,
  });

  if (req.body.invoiceId) {
    const invoice = await Invoice.findOne({ _id: req.body.invoiceId, hotelId });
    if (invoice) {
      invoice.amountPaid = toNum(invoice.amountPaid) + toNum(req.body.amount);
      invoice.balanceDue = Math.max(0, toNum(invoice.grandTotal) - toNum(invoice.amountPaid));
      invoice.status = invoiceStatus(invoice);
      await invoice.save();
    }
  }

  await audit(req, "accounts.receipt.create", "Receipt recorded", { receiptId: receipt._id });
  res.status(201).json({ success: true, data: receipt });
});

exports.collectInvoicePayment = asyncHandler(async (req, res) => {
  req.body.invoiceId = req.params.invoiceId;
  return exports.createReceipt(req, res);
});
