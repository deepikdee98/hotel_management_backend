const asyncHandler = require("express-async-handler");

const ServiceTransaction = require("../../models/Admin/serviceTransactionModel");
const { paginate } = require("../../services/accountsService");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.listServiceTransactions = asyncHandler(async (req, res) => {
  const { items, pagination } = await paginate(ServiceTransaction, tenantFilter(req, "createdAt", search(req.query.search, ["serviceName", "remark"])), req.query, { sort: { createdAt: -1 } });
  res.json({ success: true, data: { serviceTransactions: items, pagination } });
});
