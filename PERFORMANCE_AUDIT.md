# Backend Performance Audit

## What Changed

- Added production config parsing in `config/env.js` so tuning values are centralized and environment based.
- Added structured logging with `pino` and request logging via `pino-http`.
- Added response compression, request timeouts, body-size limits, Mongo injection sanitization, and production CORS handling.
- Added health and metrics endpoints: `GET /health` and `GET /metrics`.
- Added Redis-compatible caching through `utils/cache.js`, with in-memory fallback for local development.
- Added PM2 cluster configuration in `ecosystem.config.js`.
- Added graceful shutdown for HTTP, Redis, and MongoDB connections.
- Added MongoDB pool tuning and slow-query logging through a Mongoose performance plugin.
- Optimized the super-admin dashboard into parallelized/faceted queries plus short-lived cache.
- Optimized auth and protected middleware query payloads with `select()`, `lean()`, and short-lived auth/hotel cache.
- Added targeted indexes for login, dashboard, hotel/module, and notification query paths.

## MongoDB Index Strategy

Authentication:
- `users.email`
- `users.username`
- `users.phone`
- `users.role + users.isActive`
- `users.hotelId + users.role + users.isActive`

Dashboard and hotel listing:
- `hotels.status + hotels.createdAt`
- `hotels.createdAt`
- `hotels.modules`
- `hotels.name/city/country/email` text index

Notifications:
- `adminnotifications.createdAt`
- `adminnotifications.publishAt + expireAt`
- `adminnotifications.type + priority + createdAt`
- audience hotel/module indexes

After deploying, verify with:

```bash
mongosh "$CONNECTION_STRING" --eval 'db.users.getIndexes(); db.hotels.getIndexes(); db.adminnotifications.getIndexes();'
```

Use `explain("executionStats")` for any API that shows latency under load.

## Redis Caching

Set:

```bash
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
DASHBOARD_CACHE_TTL_SECONDS=30
AUTH_CACHE_TTL_SECONDS=15
```

The dashboard cache reduces repeated aggregation pressure during load tests. Auth and hotel cache reduce repeated DB calls from protected endpoints while keeping TTL short enough for operational changes to propagate quickly.

## JWT And Bcrypt

- Access tokens default to `15m`.
- Refresh tokens default to `30d`.
- Tokens are returned in the JSON response and also set as HTTP-only cookies.
- `tokenVersion` still invalidates sessions on logout/password reset/password change.
- `BCRYPT_SALT_ROUNDS` defaults to `10`. For most Node APIs, `10` to `12` is the right production range. If login latency is already ~2s under concurrency, keep `10`, scale workers horizontally, and add auth rate limiting instead of increasing rounds.

## Load Testing Recommendations

- Do not use JMeter GUI for high thread counts. Use non-GUI mode:

```bash
jmeter -n -t test-plan.jmx -l results.jtl -e -o report
```

- Separate tests for login and read APIs. Login is CPU-bound because bcrypt is intentionally expensive.
- Use realistic arrival rates instead of only huge thread counts.
- For 1000+ users, test through the same topology as production: load balancer, PM2 cluster, Redis, and production-sized MongoDB.
- Track p95/p99 latency, error rate, CPU, memory, Mongo connection count, Mongo slow query logs, and Redis hit rate.

## Production Runtime

Use Node `>=20.19.0` because current MongoDB/Mongoose packages require it.

PM2:

```bash
npm run pm2:start
npm run pm2:reload
```

Recommended environment:

```bash
NODE_ENV=production
PORT=3001
WEB_CONCURRENCY=max
TRUST_PROXY=true
CORS_ORIGINS=https://your-frontend.example.com
MONGO_MAX_POOL_SIZE=100
MONGO_MIN_POOL_SIZE=5
REQUEST_TIMEOUT_MS=30000
RATE_LIMIT_ENABLED=true
API_RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=50
RUN_CRON_JOBS=true
```

In PM2 cluster mode, cron jobs are automatically started only by `NODE_APP_INSTANCE=0` to avoid duplicate scheduled database writes.

## Monitoring

Recommended stack:
- Prometheus/Grafana for metrics and dashboards
- MongoDB Atlas monitoring or database profiler for slow queries
- PM2 monitoring for process health
- Sentry or a similar error tracker for production exceptions
- Centralized log shipping for Pino JSON logs

## Next High-Impact Refactors

- Move large controllers into service/repository layers module by module.
- Add request validators per route.
- Add cursor pagination to high-volume tables that grow beyond a few thousand rows.
- Add cache invalidation to staff/admin mutations that affect dashboard counts.
- Add automated load-test scripts and performance budgets to CI.
