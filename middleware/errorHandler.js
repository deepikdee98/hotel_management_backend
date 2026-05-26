const { constants } = require("../constants");
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const isProduction = process.env.NODE_ENV === "production";
  const safeMessage = isProduction && statusCode >= 500 ? "Internal server error" : err.message;

  const response = {
    title: getTitle(statusCode),
    message: safeMessage,
  };

  logger[statusCode >= 500 ? "error" : "warn"]({
    error: err.message,
    stack: err.stack,
    method: req.method,
    originalUrl: req.originalUrl,
    statusCode,
  }, "Request failed");

  if (!isProduction) {
    response.stackTrace = err.stack
      ? err.stack.split("\n").map(line => line.trim())
      : null;
  }

  res.status(statusCode).json(response);
};

function getTitle(statusCode) {
  switch (statusCode) {
    case constants.VALIDATION_ERROR:
      return "Validation Failed";
    case constants.NOT_FOUND:
      return "Not Found";
    case constants.UNAUTHORIZED:
      return "Unauthorized";
    case constants.FORBIDDEN:
      return "Forbidden";
    case constants.SERVER_ERROR:
      return "Server Error";
    default:
      return "Error";
  }
}

module.exports = errorHandler;
