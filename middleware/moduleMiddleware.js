const { constants } = require("../constants");

const authorizeModule = (moduleName) => {
  return (req, res, next) => {

     if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // SuperAdmin has access to all modules.
    if (req.user.role === "superadmin") {
      return next();
    }

    const assignedModules = Array.isArray(req.user.modules) ? req.user.modules : [];
    const allowedModules = Array.isArray(moduleName) ? moduleName : [moduleName];

    if (
      ["hoteladmin", "staff"].includes(req.user.role) &&
      allowedModules.some((module) => assignedModules.includes(module))
    ) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. You do not have access to the ${allowedModules.join(" or ")} module.`,
    });
  };
};

module.exports = { authorizeModule };
