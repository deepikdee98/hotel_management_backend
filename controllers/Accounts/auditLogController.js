const asyncHandler = require("express-async-handler");

const AuditLog = require("../../models/AuditLog");
const { paginate } = require("../../services/accountsService");
const { tenantFilter, search } = require("./accountsControllerHelpers");

exports.auditLogs = asyncHandler(async (req, res) => {
  const { items, pagination } = await paginate(AuditLog, tenantFilter(req, "createdAt", search(req.query.search, ["step", "message"])), req.query, { sort: { createdAt: -1 } });
  res.json({ success: true, data: { auditLogs: items, pagination } });
});
