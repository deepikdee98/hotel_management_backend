const Hotel = require("../../../../models/SuperAdmin/hotelModel");


// @desc    Get Hotel Config
// @route   GET /admin/setup/hotel-config
// @access  Private (Hotel Admin)
const getHotelConfig = async (req, res) => {
  try {

    const hotel = await Hotel.findById(req.user.hotelId);

    if (!hotel) {
      return res.status(404).json({
        message: "Hotel not found"
      });
    }

    res.json(hotel);

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
      dateFormat
    } = req.body;

    const hotel = await Hotel.findById(req.user.hotelId);

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
    hotel.currency = currency || hotel.currency;
    hotel.dateFormat = dateFormat || hotel.dateFormat;

    const updatedHotel = await hotel.save();

    res.json({
      message: "Hotel configuration updated successfully",
      hotel: updatedHotel
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to update hotel configuration"
    });

  }
};


module.exports = {
  getHotelConfig,
  updateHotelConfig
};