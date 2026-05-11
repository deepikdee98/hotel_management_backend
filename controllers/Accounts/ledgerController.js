const asyncHandler = require("express-async-handler");

const LedgerAccount = require("../../models/Admin/ledgerAccountModel");
const { toNum, requireTenant, getBusinessId, dateRangeFilter, ensureChartOfAccounts } = require("../../services/accountsService");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.chartOfAccounts = asyncHandler(async (req, res) => {
  const hotelId = requireTenant(req);
  const businessId = getBusinessId(req);
  await ensureChartOfAccounts(hotelId, businessId);
  const filter = tenantFilter(req, null, search(req.query.search, ["code", "name"]));
  if (req.query.type && req.query.type !== "all") filter.type = req.query.type;
  const accounts = await LedgerAccount.find(filter).sort({ code: 1 });
  res.json({ success: true, data: { accounts } });
});

exports.ledgerEntries = asyncHandler(async (req, res) => {
  const accountOr = [{ code: req.params.accountId }];
  if (/^[0-9a-f]{24}$/i.test(req.params.accountId)) accountOr.push({ _id: req.params.accountId });
  const account = await LedgerAccount.findOne({ hotelId: requireTenant(req), $or: accountOr });
  if (!account) return res.status(404).json({ success: false, message: "Account not found" });

  let entries = account.entries || [];
  const range = dateRangeFilter(req.query, "date");
  if (range.date) {
    entries = entries.filter((entry) => (!range.date.$gte || entry.date >= range.date.$gte) && (!range.date.$lte || entry.date <= range.date.$lte));
  }

  let running = 0;
  const rows = entries.map((entry) => {
    running += toNum(entry.debit) - toNum(entry.credit);
    return { ...entry.toObject(), particulars: entry.description, voucherNo: entry.reference, balance: running };
  });
  res.json({ success: true, data: { account, openingBalance: 0, entries: rows, closingBalance: running } });
});
