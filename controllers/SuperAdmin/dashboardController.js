const asyncHandler = require("express-async-handler");
const Hotel = require("../../models/SuperAdmin/hotelModel");
const User = require("../../models/userModel");
const cache = require("../../utils/cache");
const cacheKeys = require("../../utils/cacheKeys");
const { env } = require("../../config/env");

// @desc    Get Super Admin Dashboard Stats
// @route   GET /super-admin/dashboard/stats
// @access  Private (Super Admin)

const getDashboardStats = asyncHandler(async (req, res) => {
  const cached = await cache.get(cacheKeys.superAdminDashboard);
  if (cached) {
    res.set("X-Cache", "HIT");
    return res.status(200).json(cached);
  }

  const [hotelStats, activeStaff] = await Promise.all([
    Hotel.aggregate([
      {
        $facet: {
          counts: [
            {
              $group: {
                _id: null,
                totalHotels: { $sum: 1 },
                activeHotels: {
                  $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
                },
                totalRooms: { $sum: { $ifNull: ["$totalRooms", 0] } },
              },
            },
          ],
          recentHotels: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                name: 1,
                city: 1,
                country: 1,
                totalRooms: 1,
                modules: 1,
                status: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
    ]),
    User.countDocuments({
      role: { $in: ["hoteladmin", "staff"] },
      isActive: true,
    }),
  ]);

  const counts = hotelStats[0]?.counts?.[0] || {};
  const body = {
    stats: {
      totalHotels: counts.totalHotels || 0,
      activeHotels: counts.activeHotels || 0,
      totalRooms: counts.totalRooms || 0,
      activeStaff,
    },
    recentHotels: hotelStats[0]?.recentHotels || [],
  };

  await cache.set(cacheKeys.superAdminDashboard, body, env.dashboardCacheTtlSeconds);
  res.set("X-Cache", "MISS");
  res.status(200).json(body);

});

module.exports = { getDashboardStats };
