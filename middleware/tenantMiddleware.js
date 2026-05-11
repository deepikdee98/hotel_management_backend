const { constants } = require("../constants");

/**
 * Middleware to auto-inject hotelId into req.body and prevent frontend manipulation
 */
const injectTenantId = (req, res, next) => {
  // Superadmin doesn't have a fixed hotelId
  if (req.user && req.user.role === "superadmin") {
    return next();
  }

  if (req.user && req.user.hotelId) {
    // If hotelId is provided in body, override it with the authenticated user's hotelId
    // to prevent malicious creation of entities for other hotels
    if (req.body) {
      req.body.hotelId = req.user.hotelId;
    }
    
    // Also attach to req for easy access
    req.tenantId = req.user.hotelId;
  } else {
    return res.status(constants.UNAUTHORIZED).json({
      message: "Hotel context missing for the user",
    });
  }

  next();
};

module.exports = { injectTenantId };
