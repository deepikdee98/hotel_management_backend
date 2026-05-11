const asyncHandler = require("express-async-handler");

const AccountsTransaction = require("../../models/Admin/accountsTransactionModel");
const {
  normalizeType,
  requireTenant,
  getBusinessId,
  paginate,
  postLedgerEntry,
  audit,
} = require("../../services/accountsService");
const { requireFields, assertPositiveAmount } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listTransactions = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req, "date", search(req.query.search, ["description", "reference", "category"]));
  if (req.query.type && req.query.type !== "all") filter.type = normalizeType(req.query.type);
  if (req.query.category && req.query.category !== "all") filter.category = req.query.category;
  if (req.query.paymentMode) filter.paymentMode = req.query.paymentMode;

  const { items, pagination } = await paginate(AccountsTransaction, filter, req.query, { sort: { date: -1, createdAt: -1 } });
  const totalIncome = items.filter((tx) => tx.type === "Income").reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = items.filter((tx) => tx.type === "Expense").reduce((sum, tx) => sum + tx.amount, 0);
  res.json({ success: true, data: { transactions: items, summary: { totalIncome, totalExpense, netAmount: totalIncome - totalExpense }, pagination } });
});

exports.createTransaction = asyncHandler(async (req, res) => {
  requireFields(req.body, ["type", "category", "description", "amount"]);
  assertPositiveAmount(req.body.amount);

  const hotelId = requireTenant(req);
  const businessId = getBusinessId(req);
  const tx = await AccountsTransaction.create({ ...req.body, hotelId, businessId, type: normalizeType(req.body.type), createdBy: req.user._id });

  await postLedgerEntry({
    hotelId,
    businessId,
    account: req.body.ledgerAccountId || req.body.ledgerAccount,
    fallbackCode: tx.type === "Income" ? "4001" : "5003",
    date: tx.date,
    description: tx.description,
    reference: tx.reference,
    debit: tx.type === "Income" ? tx.amount : 0,
    credit: tx.type === "Income" ? 0 : tx.amount,
  });
  await audit(req, "accounts.transaction.create", "Transaction recorded", { transactionId: tx._id });
  res.status(201).json({ success: true, data: tx });
});
