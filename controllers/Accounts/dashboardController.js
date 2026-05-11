const asyncHandler = require("express-async-handler");

const AccountsTransaction = require("../../models/Admin/accountsTransactionModel");
const Invoice = require("../../models/Admin/invoiceModel");
const { toNum, requireTenant, getBusinessId, invoiceStatus } = require("../../services/accountsService");

exports.dashboard = asyncHandler(async (req, res) => {
  const hotelId = requireTenant(req);
  const businessId = getBusinessId(req);
  const scoped = { hotelId, ...(businessId ? { businessId } : {}) };
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(todayEnd.getFullYear(), todayEnd.getMonth(), 1);

  const [today, month, recentTransactions, pendingPayments] = await Promise.all([
    AccountsTransaction.find({ ...scoped, date: { $gte: todayStart, $lte: todayEnd } }),
    AccountsTransaction.find({ ...scoped, date: { $gte: monthStart, $lte: todayEnd } }),
    AccountsTransaction.find(scoped).sort({ date: -1, createdAt: -1 }).limit(5),
    Invoice.find({ ...scoped, status: { $in: ["pending", "partial", "overdue"] } }).sort({ dueDate: 1 }).limit(10),
  ]);

  const sum = (rows, type) => rows.filter((row) => row.type === type).reduce((total, row) => total + toNum(row.amount), 0);
  res.json({
    success: true,
    data: {
      summary: {
        todayRevenue: sum(today, "Income"),
        todayExpenses: sum(today, "Expense"),
        monthlyRevenue: sum(month, "Income"),
        monthlyExpenses: sum(month, "Expense"),
        monthlyNetProfit: sum(month, "Income") - sum(month, "Expense"),
        pendingPayments: pendingPayments.reduce((total, invoice) => total + toNum(invoice.balanceDue), 0),
        pendingInvoiceCount: pendingPayments.length,
      },
      recentTransactions,
      pendingPayments: pendingPayments.map((invoice) => ({
        id: invoice.invoiceNumber,
        guest: invoice.guestName || invoice.customerName || invoice.companyName || "Customer",
        amount: invoice.balanceDue,
        dueDate: invoice.dueDate,
        status: invoiceStatus(invoice),
      })),
    },
  });
});
