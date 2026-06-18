const asyncHandler = require("express-async-handler");

const AccountsTransaction = require("../../models/Admin/accountsTransactionModel");
const OutgoingPayment = require("../../models/Admin/outgoingPaymentModel");
const Receipt = require("../../models/Admin/receiptModel");
const { requireTenant, getBusinessId } = require("../../services/accountsService");
const { sourceModuleFilter } = require("./accountsControllerHelpers");

exports.dayBook = asyncHandler(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const hotelId = requireTenant(req);
  const businessId = getBusinessId(req);
  const tenant = {
    hotelId,
    ...(businessId ? { businessId } : {}),
  };
  const sourceFilter = sourceModuleFilter(req.query.sourceModule);
  const [transactions, receipts, payments] = await Promise.all([
    AccountsTransaction.find({ ...tenant, ...sourceFilter, date: { $gte: start, $lte: end } }).sort({ date: 1 }),
    Receipt.find({ ...tenant, ...sourceFilter, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 }),
    OutgoingPayment.find({ ...tenant, ...sourceFilter, paymentDate: { $gte: start, $lte: end } }).sort({ paymentDate: 1 }),
  ]);

  const entries = [
    ...transactions.map((tx) => ({
      time: tx.date?.toTimeString().slice(0, 5),
      type: tx.type.toLowerCase(),
      description: tx.description,
      category: tx.category,
      mode: tx.paymentMode,
      amount: tx.amount,
      sourceModule: tx.sourceModule || "manual",
    })),
    ...receipts.map((receipt) => ({
      time: receipt.createdAt?.toTimeString().slice(0, 5),
      type: "income",
      description: receipt.remarks || receipt.receiptType || "Receipt",
      category: receipt.receiptType || "Receipt",
      mode: receipt.paymentMode,
      amount: receipt.amount,
      sourceModule: receipt.sourceModule || "manual",
    })),
    ...payments.map((payment) => ({
      time: payment.paymentDate?.toTimeString().slice(0, 5),
      type: "expense",
      description: payment.description || payment.paymentType || "Payment",
      category: payment.category || payment.paymentType || "Payment",
      mode: payment.paymentMode,
      amount: payment.amount,
      sourceModule: payment.sourceModule || "manual",
    })),
  ].sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  const totalReceipts = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const totalPayments = entries.filter((entry) => entry.type !== "income").reduce((sum, entry) => sum + entry.amount, 0);
  res.json({
    success: true,
    data: {
      date: start.toISOString().slice(0, 10),
      entries,
      receipts: entries.filter((entry) => entry.type === "income"),
      payments: entries.filter((entry) => entry.type !== "income"),
      summary: { totalReceipts, totalPayments, netCashFlow: totalReceipts - totalPayments },
    },
  });
});
