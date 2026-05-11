const asyncHandler = require("express-async-handler");

const AccountsTransaction = require("../../models/Admin/accountsTransactionModel");
const LedgerAccount = require("../../models/Admin/ledgerAccountModel");
const { toNum, requireTenant, getBusinessId, ensureChartOfAccounts } = require("../../services/accountsService");
const { tenantFilter } = require("./accountsControllerHelpers");

exports.profitLoss = asyncHandler(async (req, res) => {
  const transactions = await AccountsTransaction.find(tenantFilter(req, "date"));
  const grouped = (type) => Object.entries(transactions.filter((tx) => tx.type === type).reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + toNum(tx.amount);
    return acc;
  }, {})).map(([category, amount]) => ({ category, amount, lastPeriod: 0 }));
  const revenue = grouped("Income");
  const expenses = grouped("Expense");
  const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  res.json({ success: true, data: { revenue, expenses, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses, profitMargin: totalRevenue ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0 } });
});

exports.balanceSheet = asyncHandler(async (req, res) => {
  const hotelId = requireTenant(req);
  await ensureChartOfAccounts(hotelId, getBusinessId(req));
  const accounts = await LedgerAccount.find(tenantFilter(req, null));
  const section = (type) => accounts.filter((account) => account.type === type).map((account) => ({ name: account.name, amount: Math.abs(toNum(account.balance)) }));
  res.json({ success: true, data: { asOf: req.query.asOfDate || new Date().toISOString().slice(0, 10), assets: { current: section("Asset"), fixed: [], other: [] }, liabilities: { current: section("Liability"), longTerm: [] }, equity: section("Equity") } });
});
