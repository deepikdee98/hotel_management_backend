const mongoose = require("mongoose");

const AuditLog = require("../models/AuditLog");
const Counter = require("../models/Admin/counterModel");
const LedgerAccount = require("../models/Admin/ledgerAccountModel");
const AccountSettings = require("../models/Admin/accountSettingsModel");

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "income") return "Income";
  if (raw === "expense") return "Expense";
  if (raw === "transfer") return "Transfer";
  if (raw === "refund") return "Refund";
  if (raw === "journal") return "Journal";
  return value;
};

function getHotelId(req) {
  if (req.user?.role === "superadmin") {
    return req.query.hotelId || req.body.hotelId || req.user.hotelId;
  }
  return req.user?.hotelId;
}

function requireTenant(req) {
  const hotelId = getHotelId(req);
  if (!hotelId) {
    const error = new Error("hotelId is required for multi-hotel data access");
    error.statusCode = 400;
    throw error;
  }
  return hotelId;
}

const getBusinessId = (req) => String(req.query.businessId || req.body.businessId || req.user?.businessId || "");

function dateRangeFilter(query, field = "date") {
  const filter = {};
  if (!field) return filter;
  const from = query.fromDate || query.startDate;
  const to = query.toDate || query.endDate;
  if (from || to) {
    filter[field] = {};
    if (from) filter[field].$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      if (!String(to).includes("T")) end.setHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }
  return filter;
}

function pagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
  return { page, limit, skip: (page - 1) * limit };
}

async function paginate(model, filter, query, options = {}) {
  const { page, limit, skip } = pagination(query);
  const sort = options.sort || { createdAt: -1 };
  const [items, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(limit).populate(options.populate || ""),
    model.countDocuments(filter),
  ]);
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function nextNumber(hotelId, prefix) {
  const date = new Date();
  const key = `${prefix}${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const counter = await Counter.findOneAndUpdate(
    { hotelId, date: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}${String(counter.seq).padStart(5, "0")}`;
}

function calculateInvoiceTotals(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const normalizedItems = items.map((item) => {
    const quantity = toNum(item.quantity || 1);
    const rate = toNum(item.rate);
    const amount = toNum(item.amount || quantity * rate);
    const cgstRate = toNum(item.cgstRate);
    const sgstRate = toNum(item.sgstRate);
    const cgstAmount = toNum(item.cgstAmount || (amount * cgstRate) / 100);
    const sgstAmount = toNum(item.sgstAmount || (amount * sgstRate) / 100);
    return {
      description: item.description,
      quantity,
      rate,
      amount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      total: toNum(item.total || amount + cgstAmount + sgstAmount),
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.amount, 0) || toNum(payload.subtotal || payload.roomCharges);
  const cgst = normalizedItems.reduce((sum, item) => sum + item.cgstAmount, 0) || toNum(payload.cgst);
  const sgst = normalizedItems.reduce((sum, item) => sum + item.sgstAmount, 0) || toNum(payload.sgst);
  const totalTax = toNum(payload.totalTax || payload.taxes || cgst + sgst);
  const discount = toNum(payload.discount);
  const grandTotal = toNum(payload.grandTotal || payload.total || Math.max(0, subtotal + totalTax - discount));
  const amountPaid = toNum(payload.amountPaid || payload.paid);
  const balanceDue = Math.max(0, toNum(payload.balanceDue || payload.balance || grandTotal - amountPaid));

  return { items: normalizedItems, subtotal, cgst, sgst, totalTax, grandTotal, amountPaid, balanceDue };
}

function invoiceStatus(invoice) {
  if (toNum(invoice.balanceDue) <= 0 && toNum(invoice.grandTotal) > 0) return "paid";
  if (toNum(invoice.amountPaid) > 0) return "partial";
  if (invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now()) return "overdue";
  return invoice.status === "draft" ? "draft" : "pending";
}

async function ensureChartOfAccounts(hotelId, businessId = "") {
  const existing = await LedgerAccount.find({ hotelId, ...(businessId ? { businessId } : {}) }).sort({ code: 1 });
  if (existing.length) return existing;

  return LedgerAccount.insertMany([
    { hotelId, businessId, code: "1001", name: "Cash in Hand", type: "Asset", normalBalance: "Dr" },
    { hotelId, businessId, code: "1002", name: "Bank Account", type: "Asset", normalBalance: "Dr" },
    { hotelId, businessId, code: "1003", name: "Accounts Receivable", type: "Asset", normalBalance: "Dr" },
    { hotelId, businessId, code: "2001", name: "Accounts Payable", type: "Liability", normalBalance: "Cr" },
    { hotelId, businessId, code: "2002", name: "Advance Deposits", type: "Liability", normalBalance: "Cr" },
    { hotelId, businessId, code: "3001", name: "Capital", type: "Equity", normalBalance: "Cr" },
    { hotelId, businessId, code: "4001", name: "Room Revenue", type: "Income", normalBalance: "Cr" },
    { hotelId, businessId, code: "4002", name: "F&B Revenue", type: "Income", normalBalance: "Cr" },
    { hotelId, businessId, code: "4003", name: "Other Services Revenue", type: "Income", normalBalance: "Cr" },
    { hotelId, businessId, code: "5001", name: "Salaries & Wages", type: "Expense", normalBalance: "Dr" },
    { hotelId, businessId, code: "5002", name: "Utilities", type: "Expense", normalBalance: "Dr" },
    { hotelId, businessId, code: "5003", name: "Supplies", type: "Expense", normalBalance: "Dr" },
    { hotelId, businessId, code: "5004", name: "Maintenance", type: "Expense", normalBalance: "Dr" },
  ]);
}

async function findLedgerAccount(hotelId, identifier, fallbackCode, businessId = "") {
  await ensureChartOfAccounts(hotelId, businessId);
  const or = [];
  if (identifier) {
    if (mongoose.Types.ObjectId.isValid(String(identifier))) or.push({ _id: identifier });
    or.push({ code: String(identifier) }, { name: String(identifier) });
  }
  if (fallbackCode) or.push({ code: fallbackCode });
  return LedgerAccount.findOne({ hotelId, ...(businessId ? { businessId } : {}), $or: or });
}

async function postLedgerEntry({ hotelId, businessId = "", account, fallbackCode, date, description, reference, debit = 0, credit = 0 }) {
  const ledger = await findLedgerAccount(hotelId, account, fallbackCode, businessId);
  if (!ledger) return null;

  ledger.entries.push({ date: date || new Date(), description, reference, debit: toNum(debit), credit: toNum(credit) });
  ledger.balance = ledger.entries.reduce((balance, entry) => balance + toNum(entry.debit) - toNum(entry.credit), 0);
  await ledger.save();
  return ledger;
}

async function getSettings(hotelId) {
  return AccountSettings.findOneAndUpdate(
    { hotelId },
    {
      $setOnInsert: {
        gstRates: {},
        taxRates: [
          { name: "GST 18%", type: "GST", rate: 18, cgst: 9, sgst: 9, active: true },
          { name: "GST 12%", type: "GST", rate: 12, cgst: 6, sgst: 6, active: true },
          { name: "GST 5%", type: "GST", rate: 5, cgst: 2.5, sgst: 2.5, active: true },
        ],
        paymentMethods: [
          { name: "Cash", code: "CASH", ledgerAccount: "1001 - Cash in Hand", active: true },
          { name: "Credit Card", code: "CC", ledgerAccount: "1002 - Bank Account", active: true },
          { name: "UPI", code: "UPI", ledgerAccount: "1002 - Bank Account", active: true },
          { name: "Bank Transfer", code: "BT", ledgerAccount: "1002 - Bank Account", active: true },
        ],
        expenseCategories: [
          { name: "Utilities", code: "UTL", ledgerAccount: "5002 - Utilities", active: true },
          { name: "Supplies", code: "SUP", ledgerAccount: "5003 - Supplies", active: true },
          { name: "Maintenance", code: "MNT", ledgerAccount: "5004 - Maintenance", active: true },
          { name: "Payroll", code: "PAY", ledgerAccount: "5001 - Salaries", active: true },
        ],
      },
    },
    { new: true, upsert: true }
  );
}

async function audit(req, step, message, context = {}, level = "info") {
  if (!req.user?.hotelId) return null;
  const businessDateKey = new Date().toISOString().slice(0, 10);
  return AuditLog.create({
    hotelId: req.user.hotelId,
    businessDateKey,
    level,
    step,
    message,
    action: "SYSTEM",
    module: "ACCOUNTS",
    context: {
      ...context,
      userId: req.user._id,
      businessId: getBusinessId(req),
    },
  });
}

module.exports = {
  toNum,
  normalizeType,
  getHotelId,
  requireTenant,
  getBusinessId,
  dateRangeFilter,
  paginate,
  nextNumber,
  calculateInvoiceTotals,
  invoiceStatus,
  ensureChartOfAccounts,
  postLedgerEntry,
  getSettings,
  audit,
};
