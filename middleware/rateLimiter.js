const { env } = require("../config/env");

const buckets = new Map();

const createRateLimiter = ({ windowMs, max, message }) => {
  return (req, res, next) => {
    if (!env.rateLimitEnabled) return next();

    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.route?.path || req.originalUrl}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      res.set("Retry-After", Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60 * 1000).unref();

module.exports = {
  apiRateLimiter: createRateLimiter({
    windowMs: env.apiRateLimitWindowMs,
    max: env.apiRateLimitMax,
    message: "Too many requests. Please try again later.",
  }),
  authRateLimiter: createRateLimiter({
    windowMs: env.authRateLimitWindowMs,
    max: env.authRateLimitMax,
    message: "Too many authentication attempts. Please try again later.",
  }),
};
