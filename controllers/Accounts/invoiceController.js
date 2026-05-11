const asyncHandler = require("express-async-handler");

const Invoice = require("../../models/Admin/invoiceModel");
const {
  requireTenant,
  getBusinessId,
  paginate,
  nextNumber,
  calculateInvoiceTotals,
  invoiceStatus,
  getSettings,
  audit,
} = require("../../services/accountsService");
const { tenantFilter, search, mapInvoice } = require("./accountsControllerHelpers");

exports.listInvoices = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req, "invoiceDate", search(req.query.search, ["invoiceNumber", "guestName", "customerName", "room", "companyName"]));
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  const { items, pagination } = await paginate(Invoice, filter, req.query, { sort: { invoiceDate: -1, createdAt: -1 } });
  res.json({ success: true, data: { invoices: items.map(mapInvoice), pagination } });
});

exports.createInvoice = asyncHandler(async (req, res) => {
  const hotelId = requireTenant(req);
  const businessId = getBusinessId(req);
  const settings = await getSettings(hotelId);
  const totals = calculateInvoiceTotals(req.body);
  const invoice = await Invoice.create({
    ...req.body,
    ...totals,
    hotelId,
    businessId,
    invoiceNumber: req.body.invoiceNumber || await nextNumber(hotelId, settings.invoicePrefix || "INV-"),
    invoiceDate: req.body.invoiceDate || new Date(),
    status: req.body.status || invoiceStatus(totals),
    createdBy: req.user._id,
  });
  await audit(req, "accounts.invoice.create", "Invoice generated", { invoiceId: invoice._id });
  res.status(201).json({ success: true, data: mapInvoice(invoice) });
});

exports.getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.invoiceId, hotelId: requireTenant(req) });
  if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
  res.json({ success: true, data: mapInvoice(invoice) });
});

exports.updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate({ _id: req.params.invoiceId, hotelId: requireTenant(req) }, req.body, { new: true });
  if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
  res.json({ success: true, data: mapInvoice(invoice) });
});

exports.sendInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.invoiceId, hotelId: requireTenant(req) },
    { sent: true, sentMeta: req.body },
    { new: true }
  );
  if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
  res.json({ success: true, data: mapInvoice(invoice), message: "Invoice marked as sent" });
});
