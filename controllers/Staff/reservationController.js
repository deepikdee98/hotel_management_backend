const Reservation = require("../../models/Admin/reservationModel");
const Room = require("../../models/Admin/roomModel");
const generateBookingNumber = require("../Admin/FrontOffice/Reception/CheckIn/generateBookingNumber");

// @desc Staff Reservations
// @route GET /api/staff/reservations
// @access Private (Staff)

exports.getStaffReservations = async (req, res) => {
  try {
    const { status, search } = req.query;

    let filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.guestName = { $regex: search, $options: "i" };
    }

    const reservations = await Reservation.find(filter)
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 });


    const pending = await Reservation.countDocuments({ status: "confirmed" });
    const checkedIn = await Reservation.countDocuments({ status: "checked-in" });
    const checkedOut = await Reservation.countDocuments({ status: "checked-out" });

    const revenueAgg = await Reservation.aggregate([
      {
        $match: {
          status: { $in: ["checked-in", "checked-out"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const revenue = revenueAgg[0]?.total || 0;

    const formatted = reservations.map((r) => ({
      id: r._id,
      bookingNumber: r.bookingNumber || r.reservationId,
      reservationId: r.reservationId,
      guestName: r.guestName,
      room: r.room?.roomNumber,
      checkIn: r.checkInDate,
      checkOut: r.checkOutDate,
      totalAmount: r.totalAmount,
      paidAmount: r.paidAmount || 0,
      status: r.status,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          pending,
          checkedIn,
          checkedOut,
          revenue,
        },
        reservations: formatted,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create Reservation (Staff)
// @route   POST /api/staff/reservations
// @access  Private (Staff)
exports.createStaffReservation = async (req, res) => {
  try {
    const {
      guestName,
      phone,
      email,
      room,
      checkInDate,
      checkOutDate,
      totalAmount,
    } = req.body;

    const hotelId = req.user.hotelId;

    if (!guestName || !room || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }
    const roomData = await Room.findOne({
      _id: room,
      hotelId,
    });

    if (!roomData) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }
    const overlapping = await Reservation.findOne({
      room,
      hotelId,
      status: { $in: ["confirmed", "checked-in"] },
      $or: [
        {
          checkInDate: { $lt: new Date(checkOutDate) },
          checkOutDate: { $gt: new Date(checkInDate) },
        },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "Room already booked for selected dates",
      });
    }

    const generatedBooking = await generateBookingNumber(hotelId);

    const reservation = await Reservation.create({
      reservationId: "RES-" + Date.now(),
      bookingNumber: generatedBooking.bookingNumber,
      hotelId,
      guestName,
      phone,
      email,
      room,
      roomNumber: roomData.roomNumber,
      roomType: roomData.roomType,
      checkInDate,
      checkOutDate,
      totalAmount,
      paidAmount: 0,
      status: "confirmed",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: reservation,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



// @desc    Update Reservation Status (Check-in / Check-out / Cancel)
// @route   PATCH /staff/reservations/:id/status
// @access  Private (Staff)

exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const hotelId = req.user.hotelId;

    const reservation = await Reservation.findOne({
      _id: id,
      hotelId,
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }


    const validStatuses = ["confirmed", "checked-in", "checked-out", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    if (status === "checked-in") {
      if (reservation.status !== "confirmed") {
        return res.status(400).json({
          success: false,
          message: "Only confirmed reservations can be checked-in",
        });
      }

      if ((reservation.paidAmount || 0) < (reservation.totalAmount || 0)) {
        return res.status(400).json({
          success: false,
          message: "Pending payment. Please clear dues before checkout.",
        });
      }

      await Room.findOneAndUpdate({ _id: reservation.room, hotelId: req.user.hotelId }, {
        status: "occupied",
      });

      reservation.checkedInAt = new Date();
    }

    if (status === "checked-out") {
      if (reservation.status !== "checked-in") {
        return res.status(400).json({
          success: false,
          message: "Only checked-in reservations can be checked-out",
        });
      }

      await Room.findOneAndUpdate({ _id: reservation.room, hotelId: req.user.hotelId }, {
        status: "available",
      });

      reservation.checkedOutAt = new Date();
    }

    if (status === "cancelled") {
      if (reservation.status === "checked-in") {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel after check-in",
        });
      }
      await Room.findOneAndUpdate({ _id: reservation.room, hotelId: req.user.hotelId }, {
        status: "available",
      });
    }

    reservation.status = status;
    await reservation.save();

    res.json({
      success: true,
      message: "Reservation status updated successfully",
      data: reservation,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
