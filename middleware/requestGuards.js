const { env } = require("../config/env");

const requestTimeout = (req, res, next) => {
  req.setTimeout(env.requestTimeoutMs);
  res.setTimeout(env.requestTimeoutMs, () => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: "Request timed out",
      });
    }
  });
  next();
};

const sanitizeObject = (value) => {
  if (!value || typeof value !== "object") return value;

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    sanitizeObject(value[key]);
  }

  return value;
};

const sanitizeRequest = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
};

module.exports = {
  requestTimeout,
  sanitizeRequest,
};
