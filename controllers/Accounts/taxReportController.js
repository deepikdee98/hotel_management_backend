const asyncHandler = require("express-async-handler");

const Expense = require("../../models/Admin/expenseModel");
const Invoice = require("../../models/Admin/invoiceModel");
const OutgoingPayment = require("../../models/Admin/outgoingPaymentModel");
const { toNum, requireTenant } = require("../../services/accountsService");
const { tenantFilter } = require("./accountsControllerHelpers");

exports.gstReport = asyncHandler(async (req, res) => {
  const hotelId = requireTenant(req);
  const month = Number(req.query.month || new Date().getMonth() + 1);
  const year = Number(req.query.year || new Date().getFullYear());
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const [invoices, expenses] = await Promise.all([
    Invoice.find({ hotelId, invoiceDate: { $gte: start, $lte: end } }),
    Expense.find({ hotelId, date: { $gte: start, $lte: end } }),
  ]);
  const outputGST = [{
    description: "Sales",
    taxableValue: invoices.reduce((sum, invoice) => sum + toNum(invoice.subtotal), 0),
    cgst: invoices.reduce((sum, invoice) => sum + toNum(invoice.cgst), 0),
    sgst: invoices.reduce((sum, invoice) => sum + toNum(invoice.sgst), 0),
    igst: 0,
    totalGST: invoices.reduce((sum, invoice) => sum + toNum(invoice.totalTax), 0),
  }];
  const inputGST = expenses.filter((expense) => toNum(expense.taxAmount) > 0).map((expense) => ({
    description: expense.category || expense.description,
    taxableValue: toNum(expense.taxableAmount),
    cgst: toNum(expense.taxAmount) / 2,
    sgst: toNum(expense.taxAmount) / 2,
    igst: 0,
    totalGST: toNum(expense.taxAmount),
  }));
  res.json({ success: true, data: { period: { month, year }, outputGST, inputGST, netPayable: { total: outputGST.reduce((sum, item) => sum + item.totalGST, 0) - inputGST.reduce((sum, item) => sum + item.totalGST, 0) } } });
});

exports.tdsReport = asyncHandler(async (req, res) => {
  const payments = await OutgoingPayment.find(tenantFilter(req, "paymentDate", { tdsApplicable: true })).sort({ paymentDate: -1 });
  res.json({ success: true, data: { payments, totalTds: payments.reduce((sum, payment) => sum + toNum(payment.tdsAmount), 0), count: payments.length } });
});
