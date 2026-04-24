const Reservation = require("../../../../models/Admin/reservationModel");
const Room = require("../../../../models/Admin/roomModel");
const mongoose = require("mongoose");

// @desc Get Reservations 
// @route GET /admin/reservations 
// @access Private (Hotel Admin)
const getReservations = async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = { hotelId: req.user.hotelId };

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { guestName: { $regex: search, $options: "i" } },
        { reservationId: { $regex: search, $options: "i" } },
        { roomNumber: { $regex: search, $options: "i" } }
      ];
    }

    const reservations = await Reservation.find(query)
      .populate("room", "roomNumber floor")
      .populate("roomType", "name baseRate")
      .sort({ createdAt: -1 });

    res.json(reservations);

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch reservations"
    });
  }
};


// @desc Create Reservation
// @route POST /admin/reservations
// @access Private (Hotel Admin)

const createReservation = async (req, res) => {
  try {
    const {
      guestName,
      phone,
      email,
      idProofType,
      idProofNumber,
      checkInDate,
      checkOutDate,
      adults,
      children,
      roomType,
      room,
      ratePlan,
      bookingSource,
      advanceAmount,
      paymentMode,
      totalAmount
    } = req.body;

    if (
      !guestName ||
      !phone ||
      !checkInDate ||
      !checkOutDate ||
      !roomType ||
      !room ||
      !totalAmount
    ) {
      return res.status(400).json({
        message: "Required fields missing"
      });
    }

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      return res.status(400).json({
        message: "Check-out must be after check-in"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(roomType) ||
        !mongoose.Types.ObjectId.isValid(room)) {
      return res.status(400).json({
        message: "Invalid IDs"
      });
    }

    const roomDetails = await Room.findOne({
      hotelId: req.user.hotelId,
      _id: room
    });

    if (!roomDetails) {
      return res.status(404).json({
        message: "Room not found"
      });
    }

    const overlapping = await Reservation.findOne({
      room: roomDetails._id,
      status: { $ne: "cancelled" },
      checkInDate: { $lt: new Date(checkOutDate) },
      checkOutDate: { $gt: new Date(checkInDate) }
    });

    if (overlapping) {
      return res.status(400).json({
        message: "Room already booked for selected dates"
      });
    }

    const reservation = await Reservation.create({
      reservationId: "RES-" + Date.now(),
      hotelId: req.user.hotelId,
      guestName,
      phone,
      email,
      idProofType,
      idProofNumber,
      checkInDate,
      checkOutDate,
      adults,
      children,
      roomType,
      room: roomDetails._id,
      roomNumber: roomDetails.roomNumber,
      ratePlan,
      bookingSource,
      advanceAmount,
      paymentMode,
      totalAmount
    });

    await Room.findByIdAndUpdate(roomDetails._id, {
      status: "reserved"
    });

    res.status(201).json({
      message: "Reservation created successfully",
      reservation
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create reservation"
    });
  }
};


// @desc Update Reservation Status 
// @route PATCH /admin/reservations/:id/status
// @access Private (Hotel Admin)

const updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "confirmed",
      "checked-in",
      "checked-out",
      "cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found"
      });
    }

    reservation.status = status;
    await reservation.save();

    if (status === "checked-in") {
      await Room.findByIdAndUpdate(reservation.room, {
        status: "occupied"
      });
    }

    if (status === "checked-out" || status === "cancelled") {
      await Room.findByIdAndUpdate(reservation.room, {
        status: "available",
        hkStatus: "dirty"
      });
    }

    if (status === "confirmed") {
      await Room.findByIdAndUpdate(reservation.room, {
        status: "reserved"
      });
    }

    res.json({
      message: "Reservation status updated",
      reservation
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update status"
    });
  }
};


// @desc Update Reservation 
// @route PUT /admin/reservations/:id 
// @access Private (Hotel Admin)

const updateReservation = async (req, res) => {
  try {
    const updated = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      message: "Reservation updated",
      reservation: updated
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update reservation"
    });
  }
};


// @desc Delete Reservation 
// @route DELETE /admin/reservations/:id 
// @access Private (Hotel Admin)
const deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found"
      });
    }

    await reservation.deleteOne();

    await Room.findByIdAndUpdate(reservation.room, {
      status: "available"
    });

    res.json({
      message: "Reservation deleted"
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete reservation"
    });
  }
};

// @desc Get reservation by ID
// @route GET /front-office/reservations/:id
// @access Private
const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    let query = { hotelId: req.user.hotelId };

    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      query.reservationId = id;
    }

    const reservation = await Reservation.findOne(query)
      .populate("room", "roomNumber floor")
      .populate("roomType", "name baseRate");

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reservation" });
  }
};

// @desc Cancel reservation
// @route POST /front-office/reservations/:id/cancel
// @access Private
const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      hotelId: req.user.hotelId,
    });

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    reservation.status = "cancelled";
    await reservation.save();

    if (reservation.room) {
      await Room.findByIdAndUpdate(reservation.room, {
        status: "available",
        hkStatus: "dirty",
      });
    }

    res.json({
      message: "Reservation cancelled successfully",
      reservation,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel reservation" });
  }
};


module.exports = {
  createReservation,
  getReservations,
  getReservationById,
  cancelReservation,
  updateReservationStatus,
  updateReservation,
  deleteReservation
};