const express = require("express");
const dotenv = require("dotenv").config();
if (dotenv.error) {
  console.error("Error loading .env file:", dotenv.error);
} else {
  console.log(".env file loaded successfully");
}

const cors = require("cors");
const connectDb = require("./config/dbConnection");
const errorHandler = require("./middleware/errorHandler");
const { startNightAuditJob } = require("./jobs/nightAudit");
const { apiLimiter, securityHeaders } = require("./middleware/securityMiddleware");

connectDb();

const app = express();
const port = process.env.PORT || 5000;

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localhostPatterns = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools like Postman/curl.
      if (!origin) {
        return callback(null, true);
      }

      const isConfigured = configuredOrigins.includes(origin);
      const isLocalhost = localhostPatterns.some((pattern) => pattern.test(origin));

      if (isConfigured || isLocalhost) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
      preflightContinue: false,
      optionsSuccessStatus: 204,
  })
);

app.use(securityHeaders);
app.use(apiLimiter);
app.use(express.json());

// Routes
app.use("/auth", require("./routes/authRoute"));
app.use("/super-admin",require("./routes/SuperAdmin"))
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

app.use(errorHandler);

startNightAuditJob();

app.listen(port,"0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
