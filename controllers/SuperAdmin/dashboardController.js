const asyncHandler = require("express-async-handler");
const Hotel = require("../../models/SuperAdmin/hotelModel");
const User = require("../../models/userModel");
const { constants } = require("../../constants");

// @desc    Get Super Admin Dashboard Stats
// @route   GET /super-admin/dashboard/stats
// @access  Private (Super Admin)

const getDashboardStats = asyncHandler(async (req, res) => {

  const totalHotels = await Hotel.countDocuments();

  const activeHotels = await Hotel.countDocuments({ status: "active" });

  const roomsAggregation = await Hotel.aggregate([
    {
      $group: {
        _id: null,
        totalRooms: { $sum: "$totalRooms" }
      }
    }
  ]);

  const totalRooms = roomsAggregation.length > 0 ? roomsAggregation[0].totalRooms : 0;

  const activeStaff = await User.countDocuments({
    role: { $in: ["hoteladmin", "staff"] },
    isActive: true
  });

  const recentHotels = await Hotel.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name city country totalRooms modules status createdAt");

  res.status(200).json({
    stats: {
      totalHotels,
      activeHotels,
      totalRooms,
      activeStaff
    },
    recentHotels
  });

});

module.exports = { getDashboardStats };