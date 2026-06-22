const express = require("express");
const dotenv = require("dotenv").config();
const http = require("http");

if (dotenv.error) {
  console.error("Error loading .env file:", dotenv.error);
} else {
  console.log(".env file loaded successfully");
  if (!process.env.ACCESS_TOKEN_SECRET) {
    console.error("CRITICAL: ACCESS_TOKEN_SECRET is not defined in environment variables!");
  }
}

const swaggerUi = require("swagger-ui-express");
const mongoose = require("mongoose");
const connectDb = require("./config/dbConnection");
const swaggerSpec = require("./config/swagger");
const errorHandler = require("./middleware/errorHandler");
const responseTime = require("./middleware/responseTime");
const { startNightAuditJob } = require("./jobs/nightAudit");
const { startRoomBlockExpiryJob } = require("./jobs/roomBlockExpiry");
const { securityHeaders } = require("./middleware/securityMiddleware");
const { env, validateEnv } = require("./config/env");
const logger = require("./utils/logger");
const cache = require("./utils/cache");
const httpLogger = require("./middleware/httpLogger");
const { requestTimeout, sanitizeRequest } = require("./middleware/requestGuards");
const { apiRateLimiter } = require("./middleware/rateLimiter");

let compression = null;
try {
  compression = require("compression");
} catch (error) {
  logger.warn("compression package not installed; response compression disabled");
}

validateEnv();
connectDb();
cache.connect();

const app = express();
const port = env.port;

app.set("trust proxy", env.trustProxy);

// CORS FIX - must be before all routes/middlewares
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://staging.zentrictechnology.com");
  //res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
 res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

app.use(requestTimeout);
app.use(httpLogger);
app.use(require("./routes/healthRoutes"));

app.use(responseTime);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(securityHeaders);

if (compression) {
  app.use(compression({ threshold: 1024 }));
}

app.use(apiRateLimiter);
app.use(express.json({ limit: env.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }));
app.use(sanitizeRequest);

// Routes
app.use("/auth", require("./routes/authRoute"));
app.use("/super-admin", require("./routes/SuperAdmin"));
app.use("/admin", require("./routes/Admin"));
app.use("/staff", require("./routes/Staff"));
app.use("/guest", require("./routes/guestRoutes"));
app.use("/api/v1/front-office", require("./routes/frontOfficeRoutes"));
app.use("/front-office", require("./routes/checkoutRoutes"));
app.use("/front-office", require("./routes/frontOfficeRoutes"));
app.use("/accounts", require("./routes/accountsRoutes"));
app.use("/reports", require("./routes/reportsRoutes"));
app.use("/pos", require("./routes/posRoutes"));
app.use("/housekeeping", require("./routes/housekeepingRoutes"));
app.use("/api/setup", require("./routes/setupOptionRoutes"));
app.use("/api/companies", require("./routes/companyRoutes"));
app.use("/api/travel-agents", require("./routes/travelAgentRoutes"));
app.use("/api/night-audit", require("./routes/nightAuditRoutes"));
app.use("/api/referrals", require("./routes/referralRoutes"));
app.use("/uploads", require("./routes/uploadRoutes"));

app.use(errorHandler);

const shouldRunCronJobs =
  env.runCronJobs &&
  (process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === "0");

if (shouldRunCronJobs) {
  startNightAuditJob();
  startRoomBlockExpiryJob();
} else {
  logger.info({ nodeAppInstance: process.env.NODE_APP_INSTANCE }, "Cron jobs disabled for this API process");
}

const server = http.createServer(app);

server.keepAliveTimeout = Number(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS) || 65000;
server.headersTimeout = Number(process.env.SERVER_HEADERS_TIMEOUT_MS) || 66000;

server.listen(port, "0.0.0.0", () => {
  logger.info({ port, pid: process.pid }, "Server running");
});

const shutdown = async (signal) => {
  logger.info({ signal }, "Graceful shutdown started");

  server.close(async () => {
    try {
      await cache.close();
      await mongoose.connection.close(false);
      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (error) {
      logger.error({ error: error.message }, "Graceful shutdown failed");
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
