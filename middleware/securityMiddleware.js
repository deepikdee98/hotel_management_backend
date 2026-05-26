const helmet = require("helmet");
const { env } = require("../config/env");

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
      scriptSrc: env.isProduction
        ? ["'self'"]
        : ["'self'", "'unsafe-inline'"],

      /**
       * CSS Sources
       */
      styleSrc: env.isProduction
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
      upgradeInsecureRequests: env.isProduction ? [] : null,
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
  hsts: env.isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,
});

module.exports = {
  securityHeaders,
};
