const cron = require("node-cron");

const Hotel = require("../models/SuperAdmin/hotelModel");
const SystemConfig = require("../models/SystemConfig");
const { runNightAudit } = require("../services/nightAuditService");

/**
 * Normalizes a date to YYYY-MM-DD string for comparison.
 */
const normalizeDateKey = (value) => {
  if (!value) return null;
  const date = new Date(value);
  // We use local date string for business logic consistency with HH:mm comparison
  return date.toISOString().slice(0, 10);
};

/**
 * Checks if current time is past or at configured time (HH:mm)
 */
const isTimeReached = (configuredTime, now = new Date()) => {
  if (!configuredTime) return true;
  const [targetH, targetM] = configuredTime.split(":").map(Number);
  const nowH = now.getHours();
  const nowM = now.getMinutes();

  if (nowH > targetH) return true;
  if (nowH === targetH && nowM >= targetM) return true;
  return false;
};

const shouldRunNightAuditNow = (systemConfig, now = new Date()) => {
  if (!systemConfig || systemConfig.nightAuditEnabled === false) {
    return false;
  }

  // 1. Check if it's time to run
  const configuredTime = systemConfig.nightAuditTime || "00:00";
  if (!isTimeReached(configuredTime, now)) {
    return false;
  }

  // 2. Check if we already ran audit for this business date
  if (!systemConfig.lastNightAuditAt) {
    return true;
  }

  const lastAuditDateKey = normalizeDateKey(systemConfig.lastNightAuditAt);
  const currentBusinessDateKey = normalizeDateKey(systemConfig.currentBusinessDate || now);

  // If last audit was done on or after current business date, don't run again.
  // Note: runNightAudit rolls the business date forward.
  return lastAuditDateKey !== currentBusinessDateKey;
};

const runWithRetry = async (handler, retries = 1) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await handler();
    } catch (error) {
      lastError = error;
      console.error(`[NightAudit][retry:${attempt + 1}]`, error.message);
    }
  }

  throw lastError;
};

const executeNightAuditForAllHotels = async () => {
  const hotels = await Hotel.find({ status: "active" }).select("_id modules").lean();
  const systemConfigs = await SystemConfig.find({
    hotelId: { $in: hotels.map((hotel) => hotel._id) },
  }).lean();
  const systemConfigMap = new Map(systemConfigs.map((config) => [String(config.hotelId), config]));
  const now = new Date();
  let runCount = 0;

  for (const hotel of hotels) {
    if (!Array.isArray(hotel.modules) || !hotel.modules.includes("front-office")) {
      continue;
    }

    const systemConfig = systemConfigMap.get(String(hotel._id));
    if (!shouldRunNightAuditNow(systemConfig, now)) {
      continue;
    }

    await runWithRetry(
      () => runNightAudit({ hotelId: hotel._id, triggerSource: "cron" }),
      1
    );
    runCount += 1;
  }

  return runCount;
};

const startNightAuditJob = () => {
  // Run check every minute
  cron.schedule("* * * * *", async () => {
    try {
      const runCount = await executeNightAuditForAllHotels();
      if (runCount > 0) {
        console.log(`[NightAudit] Scheduled night audit completed for ${runCount} hotel(s)`);
      }
    } catch (error) {
      console.error("[NightAudit] Scheduled night audit failed", error);
    }
  });
};

module.exports = {
  startNightAuditJob,
  executeNightAuditForAllHotels,
};