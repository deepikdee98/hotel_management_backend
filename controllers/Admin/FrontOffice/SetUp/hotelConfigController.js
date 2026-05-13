const Hotel = require("../../../../models/SuperAdmin/hotelModel");
const SystemConfig = require("../../../../models/SystemConfig");

const isValidTimeFormat = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));

const normalizeCurrency = (value) => String(value || "").toUpperCase();
const normalizeDateFormat = (value) => String(value || "").toUpperCase();
const normalizePrefix = (value) => String(value || "").trim().toUpperCase();
const toPositiveInteger = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};

const buildBookingPreview = (config) => {
  const prefix = normalizePrefix(config.bookingPrefix) || "NOV";
  const digitLength = toPositiveInteger(config.digitLength, 4);
  const number = toPositiveInteger(config.currentNumber, toPositiveInteger(config.startNumber, 1));
  return `${prefix}-${String(number).padStart(digitLength, "0")}`;
};

const getOrCreateSystemConfig = async (hotelId) => {
  return SystemConfig.findOneAndUpdate(
    { hotelId },
    {
      $setOnInsert: {
        hotelId,
        currentBusinessDate: new Date(),
        nightAuditTime: "00:00",
        nightAuditEnabled: true,
        bookingPrefix: "NOV",
        startNumber: 1,
        digitLength: 4,
        resetFinancialYear: true,
        currentNumber: 1,
        currentFinancialYear: null,
        financialYearFormat: "YYYY-YY",
      },
    },
    { upsert: true, returnDocument: "after" }
  );
};


// @desc    Get Hotel Config
// @route   GET /admin/setup/hotel-config
// @access  Private (Hotel Admin)
const getHotelConfig = async (req, res) => {
  try {

    const [hotel, systemConfig] = await Promise.all([
      Hotel.findById(req.user.hotelId),
      getOrCreateSystemConfig(req.user.hotelId),
    ]);

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found"
      });
    }

    res.json({
      ...hotel.toObject(),
      nightAuditTime: systemConfig.nightAuditTime,
      nightAuditEnabled: systemConfig.nightAuditEnabled,
      currentBusinessDate: systemConfig.currentBusinessDate,
      lastNightAuditAt: systemConfig.lastNightAuditAt,
      bookingPrefix: systemConfig.bookingPrefix,
      startNumber: systemConfig.startNumber,
      digitLength: systemConfig.digitLength,
      resetFinancialYear: systemConfig.resetFinancialYear,
      currentNumber: systemConfig.currentNumber,
      currentFinancialYear: systemConfig.currentFinancialYear,
      financialYearFormat: systemConfig.financialYearFormat,
      bookingNumberPreview: buildBookingPreview(systemConfig),
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch hotel configuration"
    });

  }
};



// @desc    Update Hotel Config
// @route   PUT /admin/setup/hotel-config
// @access  Private (Hotel Admin)
const updateHotelConfig = async (req, res) => {
  try {

    const {
      name,
      address,
      phone,
      email,
      gstNumber,
      checkInTime,
      checkOutTime,
      currency,
      dateFormat,
      nightAuditTime,
      nightAuditEnabled,
      bookingPrefix,
      startNumber,
      digitLength,
      resetFinancialYear,
      currentNumber,
      currentFinancialYear,
      financialYearFormat,
    } = req.body;

    if (nightAuditTime !== undefined && !isValidTimeFormat(nightAuditTime)) {
      return res.status(400).json({
        message: "nightAuditTime must be in HH:mm format",
      });
    }

    const [hotel, systemConfig] = await Promise.all([
      Hotel.findById(req.user.hotelId),
      getOrCreateSystemConfig(req.user.hotelId),
    ]);

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found"
      });
    }

    hotel.name = name || hotel.name;
    hotel.address = address || hotel.address;
    hotel.phone = phone || hotel.phone;
    hotel.email = email || hotel.email;
    hotel.gstNumber = gstNumber || hotel.gstNumber;
    hotel.checkInTime = checkInTime || hotel.checkInTime;
    hotel.checkOutTime = checkOutTime || hotel.checkOutTime;
    hotel.currency = currency ? normalizeCurrency(currency) : hotel.currency;
    hotel.dateFormat = dateFormat ? normalizeDateFormat(dateFormat) : hotel.dateFormat;

    if (nightAuditTime !== undefined) {
      systemConfig.nightAuditTime = nightAuditTime;
    }

    if (nightAuditEnabled !== undefined) {
      systemConfig.nightAuditEnabled = Boolean(nightAuditEnabled);
    }

    if (bookingPrefix !== undefined) {
      const normalizedPrefix = normalizePrefix(bookingPrefix);
      if (!normalizedPrefix) {
        return res.status(400).json({ message: "Booking prefix is required" });
      }
      systemConfig.bookingPrefix = normalizedPrefix;
    }

    if (startNumber !== undefined) {
      systemConfig.startNumber = toPositiveInteger(startNumber, 1);
    }

    if (digitLength !== undefined) {
      systemConfig.digitLength = toPositiveInteger(digitLength, 4);
    }

    if (resetFinancialYear !== undefined) {
      systemConfig.resetFinancialYear = Boolean(resetFinancialYear);
    }

    if (currentNumber !== undefined) {
      systemConfig.currentNumber = toPositiveInteger(currentNumber, systemConfig.startNumber || 1);
    }

    if (currentFinancialYear !== undefined) {
      systemConfig.currentFinancialYear = currentFinancialYear ? String(currentFinancialYear).trim() : null;
    }

    if (financialYearFormat !== undefined) {
      systemConfig.financialYearFormat = String(financialYearFormat || "YYYY-YY").trim() || "YYYY-YY";
    }

    const [updatedHotel, updatedSystemConfig] = await Promise.all([
      hotel.save(),
      systemConfig.save(),
    ]);

    res.json({
      message: "Hotel configuration updated successfully",
      hotel: {
        ...updatedHotel.toObject(),
        nightAuditTime: updatedSystemConfig.nightAuditTime,
        nightAuditEnabled: updatedSystemConfig.nightAuditEnabled,
        currentBusinessDate: updatedSystemConfig.currentBusinessDate,
        lastNightAuditAt: updatedSystemConfig.lastNightAuditAt,
        bookingPrefix: updatedSystemConfig.bookingPrefix,
        startNumber: updatedSystemConfig.startNumber,
        digitLength: updatedSystemConfig.digitLength,
        resetFinancialYear: updatedSystemConfig.resetFinancialYear,
        currentNumber: updatedSystemConfig.currentNumber,
        currentFinancialYear: updatedSystemConfig.currentFinancialYear,
        financialYearFormat: updatedSystemConfig.financialYearFormat,
        bookingNumberPreview: buildBookingPreview(updatedSystemConfig),
      }
    });

  } catch (error) {

    res.status(500).json({
      message: error.message || "Failed to update hotel configuration"
    });

  }
};

// @desc    Complete Hotel Setup
// @route   POST /admin/setup/hotel-config/complete-setup
// @access  Private (Hotel Admin)
const completeHotelSetup = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.user.hotelId);

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found"
      });
    }

    hotel.isSetupCompleted = true;
    await hotel.save();

    res.json({
      success: true,
      message: "Hotel setup completed successfully",
      isSetupCompleted: true
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to complete hotel setup"
    });
  }
};


module.exports = {
  getHotelConfig,
  updateHotelConfig,
  completeHotelSetup
};
