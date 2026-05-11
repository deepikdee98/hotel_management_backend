const asyncHandler = require("express-async-handler");

const FinancialYear = require("../../models/Admin/financialYearModel");
const { requireTenant, getBusinessId } = require("../../services/accountsService");
const { requireFields } = require("../../validations/accountsValidation");
const { tenantFilter } = require("./accountsControllerHelpers");

exports.listFinancialYears = asyncHandler(async (req, res) => {
  const financialYears = await FinancialYear.find(tenantFilter(req, null)).sort({ startDate: -1 });
  res.json({ success: true, data: { financialYears } });
});

exports.createFinancialYear = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name", "startDate", "endDate"]);
  const financialYear = await FinancialYear.create({ ...req.body, hotelId: requireTenant(req), businessId: getBusinessId(req) });
  res.status(201).json({ success: true, data: financialYear });
});

exports.updateFinancialYear = asyncHandler(async (req, res) => {
  const financialYear = await FinancialYear.findOneAndUpdate({ _id: req.params.id, hotelId: requireTenant(req) }, req.body, { new: true });
  if (!financialYear) return res.status(404).json({ success: false, message: "Financial year not found" });
  res.json({ success: true, data: financialYear });
});
