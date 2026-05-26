let pino;

try {
  pino = require("pino");
} catch (error) {
  pino = null;
}

const redact = (value) => {
  if (!value || typeof value !== "object") return value;
  const copy = { ...value };
  for (const key of ["password", "token", "accessToken", "refreshToken", "authorization"]) {
    if (copy[key]) copy[key] = "[redacted]";
  }
  return copy;
};

const fallbackLogger = {
  info: (obj, msg) => console.log(msg || "", redact(obj)),
  warn: (obj, msg) => console.warn(msg || "", redact(obj)),
  error: (obj, msg) => console.error(msg || "", redact(obj)),
  debug: (obj, msg) => {
    if (process.env.NODE_ENV !== "production") console.debug(msg || "", redact(obj));
  },
};

const logger = pino
  ? pino({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
      redact: {
        paths: [
          "req.headers.authorization",
          "body.password",
          "body.accessToken",
          "body.refreshToken",
          "*.password",
          "*.accessToken",
          "*.refreshToken",
        ],
        censor: "[redacted]",
      },
    })
  : fallbackLogger;

module.exports = logger;
