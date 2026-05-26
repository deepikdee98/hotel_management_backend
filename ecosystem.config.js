module.exports = {
  apps: [
    {
      name: "hotel-management-api",
      script: "server.js",
      instances: process.env.WEB_CONCURRENCY || "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3001,
      },
      max_memory_restart: "512M",
      kill_timeout: 10000,
      listen_timeout: 10000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      time: true,
    },
  ],
};
