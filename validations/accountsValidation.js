const { toNum } = require("../services/accountsService");

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

function assertPositiveAmount(value, field = "amount") {
  if (toNum(value) <= 0) {
    const error = new Error(`${field} must be greater than 0`);
    error.statusCode = 400;
    throw error;
  }
}

function validateBalancedJournal(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    const error = new Error("Journal entry requires at least two lines");
    error.statusCode = 400;
    throw error;
  }
  const totalDebit = lines.reduce((sum, line) => sum + toNum(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + toNum(line.credit), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    const error = new Error("Journal entry debit and credit totals must match");
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  requireFields,
  assertPositiveAmount,
  validateBalancedJournal,
};
