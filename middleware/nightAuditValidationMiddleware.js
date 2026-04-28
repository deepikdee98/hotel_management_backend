const validateNightAuditRun = (req, res, next) => {
  const { businessDate, hotelId } = req.body;

  if (businessDate && Number.isNaN(new Date(businessDate).getTime())) {
    return res.status(400).json({
      success: false,
      message: "businessDate must be a valid date",
    });
  }

  if (req.user?.role === "superadmin" && !hotelId) {
    return res.status(400).json({
      success: false,
      message: "hotelId is required for superadmin manual audits",
    });
  }

  return next();
};

module.exports = { validateNightAuditRun };