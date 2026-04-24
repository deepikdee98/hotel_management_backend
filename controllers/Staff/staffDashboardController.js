const Room = require("../../models/Admin/roomModel");
const Reservation = require("../../models/Admin/reservationModel");
const mongoose = require("mongoose");

// @desc    Staff Dashboard
// @route   GET /api/staff/dashboard
// @access  Private (Staff)
exports.getStaffDashboard = async (req, res) => {
  try {
    const hotelId = new mongoose.Types.ObjectId(req.user.hotelId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const rooms = await Room.find({ hotelId }).lean();

    const stats = {
      available: rooms.filter(r => r.status === "available").length,
      occupied: rooms.filter(r => r.status === "occupied").length,
      reserved: rooms.filter(r => r.status === "reserved").length,
      cleaning: rooms.filter(r => r.status === "cleaning").length,
      maintenance: rooms.filter(r => r.status === "maintenance").length,
    };

    const arrivals = await Reservation.find({
      hotelId,
      checkInDate: { $gte: todayStart, $lte: todayEnd },
      status: "reserved",
    }).lean();

    const formattedArrivals = arrivals.map(r => ({
      _id: r._id,
      guestName: r.guestName,
      roomNumber: r.roomNumber,
      amount: r.totalAmount,
      paid: r.paymentStatus === "paid",
      checkInDate: r.checkInDate,
    }));

    const checkouts = await Reservation.find({
      hotelId,
      checkOutDate: { $gte: todayStart, $lte: todayEnd },
      status: "checked_in",
    }).lean();

    const formattedCheckouts = checkouts.map(r => ({
      _id: r._id,
      guestName: r.guestName,
      roomNumber: r.roomNumber,
      checkOutDate: r.checkOutDate,
    }));

    const roomOverview = rooms.map(r => ({
      roomNumber: r.roomNumber,
      status: r.status,
    }));

    res.json({
      success: true,
      stats: {
        availableRooms: stats.available,
        occupiedRooms: stats.occupied,
        pendingCheckins: arrivals.length,
        todayCheckouts: checkouts.length,
      },
      arrivals: formattedArrivals,
      checkouts: formattedCheckouts,
      roomOverview,
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};