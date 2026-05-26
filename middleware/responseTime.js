const logger = require("../utils/logger");

/**
 * Global API response time logger.
 *
 * The request start time is captured before the request moves through the
 * route stack. The "finish" event fires after Express has sent the complete
 * response, so the logged duration represents the total API handling time.
 */
const responseTime = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    try {
      const duration = Date.now() - startTime;
      const method = req.method;
      const originalUrl = req.originalUrl || req.url;
      const statusCode = res.statusCode;

      logger.info({ method, originalUrl, statusCode, duration }, "Request completed");
    } catch (error) {
      logger.error({ error: error.message }, "Failed to log API response time");
    }
  });

  next();
};

module.exports = responseTime;
