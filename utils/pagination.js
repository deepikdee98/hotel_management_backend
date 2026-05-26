const clampLimit = (limit, fallback = 20, max = 100) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const getOffsetPagination = (query, defaults = {}) => {
  const limit = clampLimit(query.limit, defaults.limit || 20, defaults.max || 100);
  const page = Math.max(Number(query.page) || 1, 1);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildCursorFilter = ({ cursor, sortField = "createdAt", direction = "desc" }) => {
  if (!cursor) return {};
  const date = new Date(cursor);
  if (Number.isNaN(date.getTime())) return {};
  return {
    [sortField]: direction === "desc" ? { $lt: date } : { $gt: date },
  };
};

module.exports = {
  clampLimit,
  getOffsetPagination,
  buildCursorFilter,
};
