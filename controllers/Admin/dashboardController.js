const Room = require("../../models/Admin/roomModel");
const Reservation = require("../../models/Admin/reservationModel");
const Staff = require("../../models/userModel");
const ServiceTransaction = require("../../models/Admin/serviceTransactionModel");
const BlockRoom = require("../../models/Admin/blockRoomModel");

// @desc Admin Dashboard
// @route GET /api/admin/dashboard
// @access Private (Admin)

const getDashboard = async (req, res) => {
  try {
    const hotelId = req.user.hotelId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const totalRooms = await Room.countDocuments({ hotelId });

    const availableRooms = await Room.countDocuments({
      hotelId,
      status: "available",
    });

    const occupiedRooms = await Room.countDocuments({
      hotelId,
      status: "occupied",
    });

    const reservedRooms = await Room.countDocuments({
      hotelId,
      status: "reserved",
    });

    const maintenanceRooms = await Room.countDocuments({
      hotelId,
      status: "blocked",
    });

    const occupancyRate =
      totalRooms > 0
        ? Math.round((occupiedRooms / totalRooms) * 100)
        : 0;


    const todayCheckIns = await Reservation.countDocuments({
      hotelId,
      checkIn: { $gte: today, $lt: tomorrow },
    });

    const todayReservations = await Reservation.find({
      hotelId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const roomRevenue = todayReservations.reduce(
      (sum, r) => sum + (r.totalAmount || 0),
      0
    );

    const todayServices = await ServiceTransaction.find({
      hotelId,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const serviceRevenue = todayServices.reduce(
      (sum, s) => sum + (s.total || 0),
      0
    );

    const totalRevenue = roomRevenue + serviceRevenue;


    const recentReservations = await Reservation.find({ hotelId })
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 })
      .limit(5);

    const formattedReservations = recentReservations.map((r) => ({
      id: r._id,
      guestName: r.guestName,
      room: r.room?.roomNumber,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount || 0,
      status: r.status,
    }));

    const totalStaff = await Staff.countDocuments({ hotelId });

    const activeStaff = await Staff.countDocuments({
      hotelId,
      status: "active",
    });

    const staffList = await Staff.find({ hotelId }).select("name role status");

    const blockedRooms = await BlockRoom.find({ hotelId, isActive: true })
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        stats: {
          occupancyRate,
          availableRooms,
          todayCheckIns,
          totalRevenue,
        },

        roomStatus: {
          available: availableRooms,
          occupied: occupiedRooms,
          reserved: reservedRooms,
          maintenance: maintenanceRooms,
        },

        recentReservations: formattedReservations,

        staff: {
          total: totalStaff,
          active: activeStaff,
          list: staffList,
        },
        blockedRooms: blockedRooms.map(b => ({
          id: b._id,
          roomNumber: b.room?.roomNumber,
          from: b.from,
          to: b.to,
          remark: b.remark
        }))
      },
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  getDashboard,
};