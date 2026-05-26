let pinoHttp;
const logger = require("../utils/logger");

try {
  pinoHttp = require("pino-http");
} catch (error) {
  pinoHttp = null;
}

module.exports = pinoHttp
  ? pinoHttp({
      logger,
      customLogLevel(req, res, error) {
        if (error || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      autoLogging: {
        ignore: (req) => req.url === "/health",
      },
    })
  : (req, res, next) => next();
