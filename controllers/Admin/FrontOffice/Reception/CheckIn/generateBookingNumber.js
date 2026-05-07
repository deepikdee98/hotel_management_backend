const SystemConfig = require("../../../../../models/SystemConfig");

const DEFAULT_CONFIG = {
  bookingPrefix: "NOV",
  startNumber: 1,
  digitLength: 4,
  resetFinancialYear: true,
  currentNumber: 1,
  financialYearFormat: "YYYY-YY",
};

const getFinancialYear = (date = new Date(), format = "YYYY-YY") => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;

  if (format === "YYYY-YYYY") return `${startYear}-${endYear}`;
  if (format === "YY-YY") return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  return `${startYear}-${String(endYear).slice(-2)}`;
};

const normalizePositiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};

const normalizePrefix = (value) => String(value || DEFAULT_CONFIG.bookingPrefix).trim().toUpperCase() || DEFAULT_CONFIG.bookingPrefix;

const getOrCreateSystemConfig = async (hotelId, now, session = null) => {
  const currentFinancialYear = getFinancialYear(now, DEFAULT_CONFIG.financialYearFormat);

  return SystemConfig.findOneAndUpdate(
    { hotelId },
    {
      $setOnInsert: {
        hotelId,
        currentBusinessDate: now,
        nightAuditTime: "00:00",
        nightAuditEnabled: true,
        ...DEFAULT_CONFIG,
        currentFinancialYear,
      },
    },
    { upsert: true, new: true, session }
  );
};

const generateBookingNumber = async (hotelId, session = null, date = new Date()) => {
  const now = date instanceof Date ? date : new Date(date);
  const existingConfig = await getOrCreateSystemConfig(hotelId, now, session);
  const startNumber = normalizePositiveNumber(existingConfig.startNumber, DEFAULT_CONFIG.startNumber);
  const digitLength = normalizePositiveNumber(existingConfig.digitLength, DEFAULT_CONFIG.digitLength);
  const financialYearFormat = existingConfig.financialYearFormat || DEFAULT_CONFIG.financialYearFormat;
  const financialYear = getFinancialYear(now, financialYearFormat);

  const updatePipeline = [
    {
      $set: {
        bookingPrefix: { $ifNull: ["$bookingPrefix", DEFAULT_CONFIG.bookingPrefix] },
        startNumber: { $ifNull: ["$startNumber", DEFAULT_CONFIG.startNumber] },
        digitLength: { $ifNull: ["$digitLength", DEFAULT_CONFIG.digitLength] },
        resetFinancialYear: { $ifNull: ["$resetFinancialYear", DEFAULT_CONFIG.resetFinancialYear] },
        currentNumber: { $ifNull: ["$currentNumber", "$startNumber"] },
        currentFinancialYear: { $ifNull: ["$currentFinancialYear", financialYear] },
      },
    },
    {
      $set: {
        currentNumber: {
          $cond: [
            {
              $and: [
                "$resetFinancialYear",
                { $ne: ["$currentFinancialYear", financialYear] },
              ],
            },
            { $add: ["$startNumber", 1] },
            { $add: ["$currentNumber", 1] },
          ],
        },
        currentFinancialYear: {
          $cond: [
            "$resetFinancialYear",
            financialYear,
            "$currentFinancialYear",
          ],
        },
      },
    },
  ];

  const updatedConfig = await SystemConfig.findOneAndUpdate(
    { hotelId },
    updatePipeline,
    { new: true, session, updatePipeline: true }
  );

  const allocatedNumber = Math.max(
    startNumber,
    normalizePositiveNumber(updatedConfig.currentNumber, startNumber + 1) - 1
  );
  const prefix = normalizePrefix(updatedConfig.bookingPrefix);
  const paddedNumber = String(allocatedNumber).padStart(digitLength, "0");

  return {
    bookingNumber: `${prefix}-${paddedNumber}`,
    number: allocatedNumber,
    financialYear,
  };
};

generateBookingNumber.getFinancialYear = getFinancialYear;

module.exports = generateBookingNumber;
