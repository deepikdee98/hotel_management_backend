const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authorizeModule } = require("../middleware/moduleMiddleware");

const AccountsTransaction = require("../models/Admin/accountsTransactionModel");
const Invoice = require("../models/Admin/invoiceModel");
const Receipt = require("../models/Admin/receiptModel");
const OutgoingPayment = require("../models/Admin/outgoingPaymentModel");
const Expense = require("../models/Admin/expenseModel");
const LedgerAccount = require("../models/Admin/ledgerAccountModel");
const AccountSettings = require("../models/Admin/accountSettingsModel");

const toNum = (v) => Number(v || 0);

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"), authorizeModule("accounts"));

// 5.1 Transactions
router.get("/transactions", asyncHandler(async (req, res) => {
  const filter = { hotelId: req.user.hotelId };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.paymentMode) filter.paymentMode = req.query.paymentMode;
  if (req.query.fromDate || req.query.toDate) {
    filter.date = {};
    if (req.query.fromDate) filter.date.$gte = new Date(req.query.fromDate);
    if (req.query.toDate) filter.date.$lte = new Date(req.query.toDate);
  }

  const transactions = await AccountsTransaction.find(filter).sort({ date: -1, createdAt: -1 });
  const totalIncome = transactions.filter((t) => t.type === "Income").reduce((s, t) => s + toNum(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + toNum(t.amount), 0);

  res.json({
    success: true,
    data: {
      transactions,
      summary: {
        totalIncome,
        totalExpense,
        netAmount: totalIncome - totalExpense,
      },
    },
  });
}));

router.post("/transactions", asyncHandler(async (req, res) => {
  const tx = await AccountsTransaction.create({
    ...req.body,
    hotelId: req.user.hotelId,
    createdBy: req.user._id,
  });

  if (req.body.ledgerAccount) {
    const account = await LedgerAccount.findOne({
      hotelId: req.user.hotelId,
      $or: [{ name: req.body.ledgerAccount }, { _id: req.body.ledgerAccount }],
    });

    if (account) {
      const isIncome = tx.type === "Income";
      account.entries.push({
        date: tx.date,
        description: tx.description,
        reference: tx.reference,
        debit: isIncome ? toNum(tx.amount) : 0,
        credit: isIncome ? 0 : toNum(tx.amount),
      });
      account.balance = account.entries.reduce((bal, e) => bal + toNum(e.debit) - toNum(e.credit), 0);
      await account.save();
      tx.ledgerAccountId = account._id;
      await tx.save();
    }
  }

  res.status(201).json({ success: true, data: tx });
}));

// 5.2 Invoices
router.get("/invoices", asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { invoices } });
}));

router.post("/invoices", asyncHandler(async (req, res) => {
  const invoice = await Invoice.create({
    ...req.body,
    hotelId: req.user.hotelId,
    invoiceNumber: req.body.invoiceNumber || `INV-${Date.now()}`,
  });
  res.status(201).json({ success: true, data: invoice });
}));

router.get("/invoices/:invoiceId", asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.invoiceId, hotelId: req.user.hotelId });
  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }
  res.json({ success: true, data: invoice });
}));

router.post("/invoices/:invoiceId/send", asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.invoiceId, hotelId: req.user.hotelId },
    { sent: true, sentMeta: req.body },
    { new: true }
  );
  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }
  res.json({ success: true, data: invoice, message: "Invoice marked as sent" });
}));

// 5.3 Receipts
router.post("/receipts", asyncHandler(async (req, res) => {
  const receipt = await Receipt.create({
    ...req.body,
    hotelId: req.user.hotelId,
    receiptNumber: req.body.receiptNumber || `RCP-${Date.now()}`,
    receivedBy: req.user._id,
  });

  if (req.body.invoiceId) {
    const invoice = await Invoice.findOne({ _id: req.body.invoiceId, hotelId: req.user.hotelId });
    if (invoice) {
      invoice.amountPaid = toNum(invoice.amountPaid) + toNum(req.body.amount);
      invoice.balanceDue = Math.max(0, toNum(invoice.grandTotal) - toNum(invoice.amountPaid));
      await invoice.save();
    }
  }

  res.status(201).json({ success: true, data: receipt });
}));

// 5.4 Payments
router.get("/payments", asyncHandler(async (req, res) => {
  const payments = await OutgoingPayment.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { payments } });
}));

router.post("/payments", asyncHandler(async (req, res) => {
  const payment = await OutgoingPayment.create({ ...req.body, hotelId: req.user.hotelId });
  res.status(201).json({ success: true, data: payment });
}));

// 5.5 Expenses
router.get("/expenses", asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { expenses } });
}));

router.post("/expenses", asyncHandler(async (req, res) => {
  const expense = await Expense.create({ ...req.body, hotelId: req.user.hotelId });
  res.status(201).json({ success: true, data: expense });
}));

// 5.6 Ledger
router.get("/ledger/chart-of-accounts", asyncHandler(async (req, res) => {
  let accounts = await LedgerAccount.find({ hotelId: req.user.hotelId }).sort({ code: 1 });
  if (!accounts.length) {
    accounts = await LedgerAccount.insertMany([
      { hotelId: req.user.hotelId, code: "1101", name: "Cash in Hand", type: "Asset" },
      { hotelId: req.user.hotelId, code: "1102", name: "Bank Account", type: "Asset" },
      { hotelId: req.user.hotelId, code: "4100", name: "Room Revenue", type: "Income" },
      { hotelId: req.user.hotelId, code: "5100", name: "Utilities Expense", type: "Expense" },
    ]);
  }

  res.json({ success: true, data: { accounts } });
}));

router.get("/ledger/:accountId/entries", asyncHandler(async (req, res) => {
  const account = await LedgerAccount.findOne({ _id: req.params.accountId, hotelId: req.user.hotelId });
  if (!account) {
    return res.status(404).json({ success: false, message: "Account not found" });
  }

  let entries = account.entries || [];
  if (req.query.fromDate || req.query.toDate) {
    entries = entries.filter((e) => {
      const time = new Date(e.date).getTime();
      const from = req.query.fromDate ? new Date(req.query.fromDate).getTime() : Number.MIN_SAFE_INTEGER;
      const to = req.query.toDate ? new Date(req.query.toDate).getTime() : Number.MAX_SAFE_INTEGER;
      return time >= from && time <= to;
    });
  }

  let running = 0;
  const withBalance = entries.map((e) => {
    running += toNum(e.debit) - toNum(e.credit);
    return { ...e.toObject(), balance: running };
  });

  res.json({
    success: true,
    data: {
      account: { id: account._id, code: account.code, name: account.name },
      openingBalance: 0,
      entries: withBalance,
      closingBalance: running,
      totalDebit: entries.reduce((s, e) => s + toNum(e.debit), 0),
      totalCredit: entries.reduce((s, e) => s + toNum(e.credit), 0),
    },
  });
}));

// 5.7 Day Book
router.get("/day-book", asyncHandler(async (req, res) => {
  const targetDate = req.query.date ? new Date(req.query.date) : new Date();
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);

  const transactions = await AccountsTransaction.find({
    hotelId: req.user.hotelId,
    date: { $gte: start, $lte: end },
  });

  const receipts = transactions
    .filter((t) => t.type === "Income")
    .map((t) => ({ description: t.description, mode: t.paymentMode, amount: t.amount, time: t.date }));
  const payments = transactions
    .filter((t) => t.type === "Expense")
    .map((t) => ({ description: t.description, mode: t.paymentMode, amount: t.amount, time: t.date }));

  const totalReceipts = receipts.reduce((s, r) => s + toNum(r.amount), 0);
  const totalPayments = payments.reduce((s, p) => s + toNum(p.amount), 0);

  res.json({
    success: true,
    data: {
      date: start.toISOString().slice(0, 10),
      openingBalance: { cash: 0, bank: 0 },
      receipts,
      payments,
      summary: {
        totalReceipts,
        totalPayments,
        netCashFlow: totalReceipts - totalPayments,
        closingBalance: { cash: totalReceipts - totalPayments, bank: 0 },
      },
    },
  });
}));

// 5.8 Tax Reports
router.get("/tax-reports/gst", asyncHandler(async (req, res) => {
  const month = Number(req.query.month || new Date().getMonth() + 1);
  const year = Number(req.query.year || new Date().getFullYear());
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const invoices = await Invoice.find({
    hotelId: req.user.hotelId,
    invoiceDate: { $gte: start, $lte: end },
  });

  const taxableValue = invoices.reduce((s, i) => s + toNum(i.subtotal), 0);
  const totalTax = invoices.reduce((s, i) => s + toNum(i.totalTax), 0);
  const halfTax = totalTax / 2;

  res.json({
    success: true,
    data: {
      period: { month, year },
      outputTax: { taxableValue, cgst: halfTax, sgst: halfTax, igst: 0, totalTax },
      inputTax: { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 },
      netPayable: { cgst: halfTax, sgst: halfTax, igst: 0, total: totalTax },
    },
  });
}));

router.get("/tax-reports/tds", asyncHandler(async (req, res) => {
  const payments = await OutgoingPayment.find({ hotelId: req.user.hotelId });
  const totalTds = payments.reduce((s, p) => s + toNum(p.tdsAmount), 0);
  res.json({ success: true, data: { totalTds, count: payments.length } });
}));

// 5.9 Financial Statements
router.get("/reports/profit-loss", asyncHandler(async (req, res) => {
  const transactions = await AccountsTransaction.find({ hotelId: req.user.hotelId });
  const totalRevenue = transactions.filter((t) => t.type === "Income").reduce((s, t) => s + toNum(t.amount), 0);
  const totalExpenses = transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + toNum(t.amount), 0);
  const netProfit = totalRevenue - totalExpenses;

  res.json({
    success: true,
    data: {
      revenue: { totalRevenue },
      expenses: { totalExpenses },
      netProfit,
      profitMargin: totalRevenue ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0,
    },
  });
}));

router.get("/reports/balance-sheet", asyncHandler(async (req, res) => {
  const accounts = await LedgerAccount.find({ hotelId: req.user.hotelId });
  const assets = accounts.filter((a) => a.type === "Asset").reduce((s, a) => s + toNum(a.balance), 0);
  const liabilities = accounts.filter((a) => a.type === "Liability").reduce((s, a) => s + toNum(a.balance), 0);
  const equity = assets - liabilities;

  res.json({
    success: true,
    data: {
      asOfDate: req.query.asOfDate || new Date().toISOString().slice(0, 10),
      assets: { totalAssets: assets },
      liabilities: { totalLiabilities: liabilities },
      equity: { totalEquity: equity },
      totalLiabilitiesAndEquity: liabilities + equity,
    },
  });
}));

// 5.10 Account Settings
router.get("/settings/tax", asyncHandler(async (req, res) => {
  const settings = await AccountSettings.findOne({ hotelId: req.user.hotelId });
  res.json({ success: true, data: settings || {} });
}));

router.put("/settings/tax", asyncHandler(async (req, res) => {
  const settings = await AccountSettings.findOneAndUpdate(
    { hotelId: req.user.hotelId },
    {
      gstNumber: req.body.gstNumber,
      gstRates: req.body.gstRates || {},
      tdsRates: req.body.tdsRates || {},
      hsnCodes: req.body.hsnCodes || {},
    },
    { new: true, upsert: true }
  );
  res.json({ success: true, data: settings });
}));

router.get("/settings/payment-methods", asyncHandler(async (req, res) => {
  const settings = await AccountSettings.findOne({ hotelId: req.user.hotelId });
  res.json({ success: true, data: { paymentMethods: settings?.paymentMethods || [] } });
}));

router.put("/settings/payment-methods", asyncHandler(async (req, res) => {
  const settings = await AccountSettings.findOneAndUpdate(
    { hotelId: req.user.hotelId },
    { paymentMethods: Array.isArray(req.body.paymentMethods) ? req.body.paymentMethods : [] },
    { new: true, upsert: true }
  );
  res.json({ success: true, data: { paymentMethods: settings.paymentMethods } });
}));

module.exports = router;
