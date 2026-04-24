const asyncHandler = require("express-async-handler");
const Room = require("../models/Admin/roomModel");
const Reservation = require("../models/Admin/reservationModel");
const Checkin = require("../models/Admin/checkinModel");
const FolioTransaction = require("../models/Admin/folioTransactionModel");

const toNum = (v) => Number(v || 0);

// @desc    Get dashboard reports summary
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardReport = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ hotelId: req.user.hotelId });
  const reservations = await Reservation.find({ hotelId: req.user.hotelId });

  const totalRooms = rooms.length;
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const available = rooms.filter((r) => r.status === "available").length;
  const outOfOrder = rooms.filter((r) => r.status === "maintenance").length;
  const blocked = rooms.filter((r) => r.status === "blocked").length;

  const expectedArrivals = reservations.filter((r) => r.status === "confirmed").length;
  const checkedIn = reservations.filter((r) => r.status === "checked-in").length;
  const checkedOut = reservations.filter((r) => r.status === "checked-out").length;

  const todayRevenue = reservations.reduce((sum, r) => sum + toNum(r.totalAmount), 0);

  res.json({
    success: true,
    data: {
      occupancy: {
        totalRooms,
        occupied,
        available,
        outOfOrder,
        blocked,
        occupancyRate: totalRooms ? Number(((occupied / totalRooms) * 100).toFixed(2)) : 0,
      },
      arrivals: {
        expected: expectedArrivals,
        checkedIn,
        pending: Math.max(expectedArrivals - checkedIn, 0),
      },
      departures: {
        expected: checkedOut,
        checkedOut,
        pending: 0,
      },
      revenue: {
        todayTotal: todayRevenue,
      },
      collections: {
        todayTotal: todayRevenue,
      },
    },
  });
});

// @desc    Get occupancy reports summary
// @route   GET /api/reports/occupancy
// @access  Private
const getOccupancyReport = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ hotelId: req.user.hotelId }).populate("roomType", "name code");
  const grouped = {
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0,
    maintenance: 0,
    blocked: 0,
  };

  rooms.forEach((room) => {
    grouped[room.status] = (grouped[room.status] || 0) + 1;
  });

  res.json({ success: true, data: { summary: grouped, rooms } });
});

// @desc    Get revenue reports summary
// @route   GET /api/reports/revenue
// @access  Private
const getRevenueReport = asyncHandler(async (req, res) => {
  const tx = await FolioTransaction.find({
    hotelId: req.user.hotelId,
    type: { $in: ["room-tariff", "service-charge", "settlement", "payment"] },
  });

  const roomRevenue = tx.filter((t) => t.type === "room-tariff").reduce((s, t) => s + toNum(t.totalAmount), 0);
  const otherRevenue = tx.filter((t) => t.type === "service-charge").reduce((s, t) => s + toNum(t.totalAmount), 0);
  const collections = tx.filter((t) => ["settlement", "payment"].includes(t.type)).reduce((s, t) => s + toNum(t.totalAmount), 0);

  res.json({
    success: true,
    data: {
      roomRevenue,
      otherRevenue,
      totalRevenue: roomRevenue + otherRevenue,
      collections,
    },
  });
});

// @desc    Get guest list report
// @route   GET /api/reports/guests
// @access  Private
const getGuestReport = asyncHandler(async (req, res) => {
  const checkins = await Checkin.find().populate("roomNumber", "roomNumber hotelId");
  const guests = checkins
    .filter((c) => c.roomNumber && String(c.roomNumber.hotelId) === String(req.user.hotelId))
    .map((c) => ({
      folioId: c._id,
      guestName: c.guestName,
      mobileNo: c.mobileNo,
      roomNumber: c.roomNumber.roomNumber,
      checkInDate: c.checkInDate,
      purposeOfVisit: c.purposeOfVisit,
      guestClassification: c.guestClassification,
    }));

  res.json({ success: true, data: { guests, count: guests.length } });
});

module.exports = {
  getDashboardReport,
  getOccupancyReport,
  getRevenueReport,
  getGuestReport,
};
