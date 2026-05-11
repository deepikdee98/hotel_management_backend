const asyncHandler = require("express-async-handler");

const CompanyBilling = require("../../models/Admin/companyBillingModel");
const { requireTenant, getBusinessId, paginate, nextNumber } = require("../../services/accountsService");
const { requireFields } = require("../../validations/accountsValidation");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listCompanyBilling = asyncHandler(async (req, res) => {
  const { items, pagination } = await paginate(CompanyBilling, tenantFilter(req, "billDate", search(req.query.search, ["billNumber", "companyName", "gstin"])), req.query, { sort: { billDate: -1 } });
  res.json({ success: true, data: { bills: items, pagination } });
});

exports.createCompanyBilling = asyncHandler(async (req, res) => {
  requireFields(req.body, ["companyId", "companyName"]);
  const hotelId = requireTenant(req);
  const bill = await CompanyBilling.create({ ...req.body, hotelId, businessId: getBusinessId(req), billNumber: req.body.billNumber || await nextNumber(hotelId, "CB-"), createdBy: req.user._id });
  res.status(201).json({ success: true, data: bill });
});
