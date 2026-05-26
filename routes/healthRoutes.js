const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();
const startedAt = Date.now();

router.get("/health", (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const healthy = mongoState === 1;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    uptimeSeconds: Math.round(process.uptime()),
    mongo: {
      state: mongoState,
      status: healthy ? "connected" : "not_connected",
    },
    memory: process.memoryUsage(),
    startedAt,
  });
});

router.get("/metrics", (req, res) => {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  res.json({
    success: true,
    process: {
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      memory,
      cpu,
    },
    mongo: {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    },
  });
});

module.exports = router;
