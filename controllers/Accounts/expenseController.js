const asyncHandler = require("express-async-handler");

const Expense = require("../../models/Admin/expenseModel");
const { requireTenant, getBusinessId, paginate, audit } = require("../../services/accountsService");
const { requireFields, assertPositiveAmount } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listExpenses = asyncHandler(async (req, res) => {
  const filter = tenantFilter(req, "date", search(req.query.search, ["description", "paidTo", "category", "billNumber"]));
  if (req.query.category && req.query.category !== "all") filter.category = req.query.category;
  const { items, pagination } = await paginate(Expense, filter, req.query, { sort: { date: -1, createdAt: -1 } });
  res.json({ success: true, data: { expenses: items, pagination } });
});

exports.createExpense = asyncHandler(async (req, res) => {
  requireFields(req.body, ["category", "description", "amount"]);
  assertPositiveAmount(req.body.amount);
  const expense = await Expense.create({ ...req.body, hotelId: requireTenant(req), businessId: getBusinessId(req), createdBy: req.user._id });
  await audit(req, "accounts.expense.create", "Expense recorded", { expenseId: expense._id });
  res.status(201).json({ success: true, data: expense });
});
