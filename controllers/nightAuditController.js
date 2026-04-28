const asyncHandler = require("express-async-handler");
const { runNightAudit, getNightAuditStatus } = require("../services/nightAuditService");

const resolveHotelId = (req) => {
  if (req.user.role === "superadmin") {
    return req.body.hotelId || req.query.hotelId || null;
  }

  return req.user.hotelId || null;
};

const runNightAuditManually = asyncHandler(async (req, res) => {
  const hotelId = resolveHotelId(req);

  if (!hotelId) {
    res.status(400);
    throw new Error("hotelId is required");
  }

  const result = await runNightAudit({
    hotelId,
    triggeredBy: req.user?._id || null,
    requestedBusinessDate: req.body.businessDate || null,
    triggerSource: "manual",
  });

  res.status(result.alreadyRun ? 200 : 201).json({
    success: true,
    alreadyRun: result.alreadyRun,
    data: result.report,
  });
});

const getNightAuditRunStatus = asyncHandler(async (req, res) => {
  const hotelId = req.user.role === "superadmin" ? (req.query.hotelId || null) : req.user.hotelId;

  if (!hotelId) {
    res.status(400);
    throw new Error("hotelId is required");
  }

  const result = await getNightAuditStatus({
    hotelId,
    businessDate: req.query.date || null,
  });

  res.json({ success: true, data: result });
});

module.exports = {
  runNightAuditManually,
  getNightAuditRunStatus,
};