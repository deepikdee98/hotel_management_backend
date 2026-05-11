const asyncHandler = require("express-async-handler");

const AccountsTransaction = require("../../models/Admin/accountsTransactionModel");
const { requireTenant, getBusinessId } = require("../../services/accountsService");

exports.dayBook = asyncHandler(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const transactions = await AccountsTransaction.find({
    hotelId: requireTenant(req),
    ...(getBusinessId(req) ? { businessId: getBusinessId(req) } : {}),
    date: { $gte: start, $lte: end },
  }).sort({ date: 1 });

  const entries = transactions.map((tx) => ({
    time: tx.date?.toTimeString().slice(0, 5),
    type: tx.type.toLowerCase(),
    description: tx.description,
    category: tx.category,
    mode: tx.paymentMode,
    amount: tx.amount,
  }));
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
