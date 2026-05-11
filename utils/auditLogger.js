const AuditLog = require("../models/AuditLog");

/**
 * Utility to log audit events
 */
const logAudit = async ({
  req,
  action,
  module,
  entityId,
  oldData = null,
  newData = null,
}) => {
  try {
    if (!req.user || !req.user._id) return;

    // For superadmin actions on other hotels, we might need hotelId from body/params
    // Otherwise fallback to user's hotelId
    let hotelId = req.user.hotelId;
    if (req.user.role === "superadmin") {
      hotelId = req.body?.hotelId || req.query?.hotelId || newData?.hotelId || null;
    }

    if (!hotelId) return; // Cannot log without hotelId

    await AuditLog.create({
      hotelId,
      userId: req.user._id,
      action,
      module,
      entityId,
      oldData,
      newData,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("Audit log failed:", error);
    // Do not throw error to avoid breaking main flow
  }
};

module.exports = { logAudit };
