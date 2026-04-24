const { constants } = require("../constants");

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode ? res.statusCode : 500;

  const response = {
    title: getTitle(statusCode),
    message: err.message,
  };

  if (process.env.NODE_ENV !== "production") {
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