const { constants } = require("../constants");

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(constants.FORBIDDEN);
      throw new Error("Access denied");
    }
    next();
  };
};

module.exports = { authorizeRoles };