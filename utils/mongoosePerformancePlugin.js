const logger = require("./logger");
const { env } = require("../config/env");

function mongoosePerformancePlugin(schema) {
  schema.pre(/^find|count|update|delete/, function startQueryTimer() {
    this._queryStartedAt = process.hrtime.bigint();
  });

  schema.post(/^find|count|update|delete/, function finishQueryTimer() {
    logDuration(this, this.op, this.getQuery && this.getQuery());
  });

  schema.pre("aggregate", function startAggregateTimer() {
    this._queryStartedAt = process.hrtime.bigint();
  });

  schema.post("aggregate", function finishAggregateTimer() {
    logDuration(this, "aggregate", this.pipeline && this.pipeline());
  });
}

function logDuration(context, operation, query) {
  if (!context?._queryStartedAt) return;
  const durationMs = Number(process.hrtime.bigint() - context._queryStartedAt) / 1e6;
  if (durationMs < env.mongoSlowQueryMs) return;

  logger.warn({
    collection: context.model?.collection?.name || context._model?.collection?.name,
    operation,
    durationMs: Math.round(durationMs),
    query,
  }, "Slow MongoDB operation");
}

module.exports = mongoosePerformancePlugin;
