const { constants } = require("../constants");

const authorizeModule = (moduleName) => {
  return (req, res, next) => {

     if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // SuperAdmin and HotelAdmin have access to all modules
    if (req.user.role === "superadmin" || req.user.role === "hoteladmin") {
      return next();
    }

    // Check if staff has the module assigned
    if (req.user.role === "staff") {
      if (req.user.modules && req.user.modules.includes(moduleName)) {
        return next();
      }
    }

    return res.status(403).json({
      message: `Access denied. You do not have access to the ${moduleName} module.`,
    });
  };
};

module.exports = { authorizeModule };
