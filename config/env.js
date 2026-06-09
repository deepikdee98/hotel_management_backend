const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3001),
  mongoUri: process.env.CONNECTION_STRING || "mongodb://127.0.0.1:27017/hotel_management",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "30d",
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS || process.env.FRONTEND_URL),
  redisUrl: process.env.REDIS_URL,
  cacheEnabled: toBool(process.env.CACHE_ENABLED, true),
  dashboardCacheTtlSeconds: toNumber(process.env.DASHBOARD_CACHE_TTL_SECONDS, 30),
  authCacheTtlSeconds: toNumber(process.env.AUTH_CACHE_TTL_SECONDS, 15),
  mongoSlowQueryMs: toNumber(process.env.MONGO_SLOW_QUERY_MS, 100),
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 30000),
  bodyLimit: process.env.BODY_LIMIT || "1mb",
  trustProxy: toBool(process.env.TRUST_PROXY, false),
  rateLimitEnabled: toBool(process.env.RATE_LIMIT_ENABLED, true),
  runCronJobs: toBool(process.env.RUN_CRON_JOBS, true),
  apiRateLimitWindowMs: toNumber(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  apiRateLimitMax: toNumber(process.env.API_RATE_LIMIT_MAX, 1000),
  authRateLimitWindowMs: toNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  authRateLimitMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 50),
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsSessionToken: process.env.AWS_SESSION_TOKEN,
  awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-south-1",
  s3Bucket: process.env.AWS_S3_BUCKET,
  s3PublicUrl: process.env.AWS_S3_PUBLIC_URL,
  s3UploadUrlExpiresSeconds: toNumber(process.env.AWS_S3_UPLOAD_URL_EXPIRES_SECONDS, 300),
  s3MaxFileSizeBytes: toNumber(process.env.AWS_S3_MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024),
};

env.isProduction = env.nodeEnv === "production";

const validateEnv = () => {
  const missing = [];
  if (!env.accessTokenSecret) missing.push("ACCESS_TOKEN_SECRET");
  if (!env.refreshTokenSecret) missing.push("REFRESH_TOKEN_SECRET or ACCESS_TOKEN_SECRET");

  if (env.isProduction && env.corsOrigins.length === 0) {
    missing.push("CORS_ORIGINS");
  }

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

module.exports = {
  env,
  validateEnv,
};
