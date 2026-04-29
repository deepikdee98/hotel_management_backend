const cron = require("node-cron");

const Hotel = require("../models/SuperAdmin/hotelModel");
const SystemConfig = require("../models/SystemConfig");
const { runNightAudit } = require("../services/nightAuditService");

const getCurrentTimeKey = (date = new Date()) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const normalizeDateKey = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
};

const shouldRunNightAuditNow = (systemConfig, now = new Date()) => {
  if (!systemConfig || systemConfig.nightAuditEnabled === false) {
    return false;
  }

  const configuredTime = systemConfig.nightAuditTime || "00:00";
  if (configuredTime !== getCurrentTimeKey(now)) {
    return false;
  }

  if (!systemConfig.lastNightAuditAt) {
    return true;
  }

  const lastAuditDateKey = normalizeDateKey(systemConfig.lastNightAuditAt);
  const currentBusinessDateKey = normalizeDateKey(systemConfig.currentBusinessDate || now);

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