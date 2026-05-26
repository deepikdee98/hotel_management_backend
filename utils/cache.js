const logger = require("./logger");
const { env } = require("../config/env");

let Redis;
try {
  Redis = require("ioredis");
} catch (error) {
  Redis = null;
}

const memoryStore = new Map();
let redisClient = null;

const connectRedis = () => {
  if (!env.cacheEnabled || !env.redisUrl || !Redis || redisClient) {
    return redisClient;
  }

  redisClient = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 2000,
  });

  redisClient.on("error", (error) => {
    logger.warn({ error: error.message }, "Redis unavailable; falling back to process memory cache");
  });

  redisClient.connect().catch((error) => {
    logger.warn({ error: error.message }, "Redis connection failed; using process memory cache");
  });

  return redisClient;
};

const getMemoryValue = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const setMemoryValue = (key, value, ttlSeconds) => {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const cache = {
  connect: connectRedis,

  async get(key) {
    if (!env.cacheEnabled) return null;
    try {
      if (redisClient?.status === "ready") {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      }
    } catch (error) {
      logger.warn({ key, error: error.message }, "Cache get failed");
    }
    return getMemoryValue(key);
  },

  async set(key, value, ttlSeconds) {
    if (!env.cacheEnabled || ttlSeconds <= 0) return;
    try {
      if (redisClient?.status === "ready") {
        await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return;
      }
    } catch (error) {
      logger.warn({ key, error: error.message }, "Cache set failed");
    }
    setMemoryValue(key, value, ttlSeconds);
  },

  async del(key) {
    try {
      if (redisClient?.status === "ready") {
        await redisClient.del(key);
      }
    } catch (error) {
      logger.warn({ key, error: error.message }, "Cache delete failed");
    }
    memoryStore.delete(key);
  },

  async delPattern(prefix) {
    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) memoryStore.delete(key);
    }

    if (redisClient?.status !== "ready") return;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length) await redisClient.del(keys);
    } while (cursor !== "0");
  },

  middleware({ keyBuilder, ttlSeconds }) {
    return async (req, res, next) => {
      if (req.method !== "GET") return next();
      const key = keyBuilder(req);
      const cached = await cache.get(key);
      if (cached) {
        res.set("X-Cache", "HIT");
        return res.status(cached.statusCode || 200).json(cached.body);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(key, { statusCode: res.statusCode, body }, ttlSeconds).catch(() => null);
        }
        res.set("X-Cache", "MISS");
        return originalJson(body);
      };

      next();
    };
  },

  async close() {
    if (redisClient) await redisClient.quit();
  },
};

module.exports = cache;
