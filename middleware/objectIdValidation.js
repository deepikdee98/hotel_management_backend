const { constants } = require("../constants");
const mongoose = require("mongoose");

const validateObjectId = (req, res, next) => {
  const idsToValidate = [];

  // Check params
  for (const key in req.params) {
    if (key.toLowerCase().endsWith("id")) {
      idsToValidate.push(req.params[key]);
    }
  }

  // Check query
  for (const key in req.query) {
    if (key.toLowerCase().endsWith("id") && typeof req.query[key] === "string") {
      idsToValidate.push(req.query[key]);
    }
  }

  for (const id of idsToValidate) {
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(constants.VALIDATION_ERROR).json({
        message: `Invalid ObjectId format: ${id}`,
      });
    }
  }

  next();
};

module.exports = { validateObjectId };
