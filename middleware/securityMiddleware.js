const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

/**
 * General API Rate Limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 300 : 1000,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});

/**
 * Auth Rate Limiter (Login/Register)
 */
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again after 1 hour.",
  },
});

/**
 * Helmet Security Headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      /**
       * Allow resources only from same origin
       */
      defaultSrc: ["'self'"],

      /**
       * JavaScript Sources
       * In development allow inline scripts for easier debugging
       */
      scriptSrc: isProduction
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"],

      /**
       * CSS Sources
       */
      styleSrc: isProduction
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"],

      /**
       * Image Sources
       */
      imgSrc: ["'self'", "data:", "https:"],

      /**
       * API / Fetch / WebSocket Connections
       */
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || "http://localhost:3000",
      ],

      /**
       * Fonts
       */
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],

      /**
       * Disable Flash / Plugins
       */
      objectSrc: ["'none'"],

      /**
       * Prevent clickjacking
       */
      frameAncestors: ["'none'"],

      /**
       * Upgrade HTTP requests to HTTPS in production
       */
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },

  /**
   * Hide X-Powered-By header
   */
  hidePoweredBy: true,

  /**
   * Prevent MIME type sniffing
   */
  noSniff: true,

  /**
   * Prevent clickjacking
   */
  frameguard: {
    action: "deny",
  },

  /**
   * Referrer Policy
   */
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  /**
   * Cross Origin Policies
   */
  crossOriginEmbedderPolicy: false,

  crossOriginResourcePolicy: {
    policy: "cross-origin",
  },

  /**
   * HSTS - Force HTTPS in production
   */
  hsts: isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  securityHeaders,
};