const Hotel = require("../../../../models/SuperAdmin/hotelModel");
const SystemConfig = require("../../../../models/SystemConfig");

const isValidTimeFormat = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));

const normalizeCurrency = (value) => String(value || "").toUpperCase();
const normalizeDateFormat = (value) => String(value || "").toUpperCase();

const getOrCreateSystemConfig = async (hotelId) => {
  return SystemConfig.findOneAndUpdate(
    { hotelId },
    {
      $setOnInsert: {
        hotelId,
        currentBusinessDate: new Date(),
        nightAuditTime: "00:00",
        nightAuditEnabled: true,
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
      }
    });

  } catch (error) {

    res.status(500).json({
      message: error.message || "Failed to update hotel configuration"
    });

  }
};


module.exports = {
  getHotelConfig,
  updateHotelConfig
};
