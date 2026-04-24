const Room = require("../../../models/Admin/roomModel");
const Reservation = require("../../../models/Admin/reservationModel");


// @desc    Get Room Lookup List
// @route   GET /api/admin/lookups/rooms
// @access  Private (Hotel Admin)
const getRoomLookup = async (req, res) => {
  try {
    const { search, status } = req.query;

    let filter = { hotelId: req.user.hotelId };

    // filter by status
    if (status && status !== "all") {
      filter.status = status;
    }

    // search by room number
    if (search) {
      filter.roomNumber = { $regex: search, $options: "i" };
    }

    const rooms = await Room.find(filter)
      .populate("roomType")
      .lean();

    const result = await Promise.all(
      rooms.map(async (room) => {

        const reservation = await Reservation.findOne({
          hotelId: req.user.hotelId,
          room: room._id,
          status: { $in: ["confirmed", "checked-in"] } 
        }).lean();

        return {
          roomNo: room.roomNumber,
          type: room.roomType?.name || "",
          floor: room.floor,

          status: room.status,
          hkStatus: room.hkStatus,

          guest: reservation?.guestName || "-",
          checkIn: reservation?.checkInDate || null,
          checkOut: reservation?.checkOutDate || null,

          rate: room.roomType?.baseRate || 0
        };
      })
    );

    res.status(200).json(result);

  } catch (error) {
    console.error("Room Lookup Error:", error);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};



// @desc    Get Guest Lookup List
// @route   GET /api/admin/lookups/guests
// @access  Private (Hotel Admin)
const getGuestLookup = async (req, res) => {
  try {
    const { search } = req.query;

    let filter = { hotelId: req.user.hotelId };

    // search guest
    if (search) {
      filter.$or = [
        { guestName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    const reservations = await Reservation.find(filter)
      .populate("room", "roomNumber floor")
      .lean();

    const result = reservations.map((resv) => ({
      reservationId: resv.reservationId,
      guestName: resv.guestName,
      phone: resv.phone,
      email: resv.email,

      room: resv.room?.roomNumber || "-",
      floor: resv.room?.floor || "-",

      checkIn: resv.checkInDate,
      checkOut: resv.checkOutDate,

      status:
        resv.status === "checked-in"
          ? "In-House"
          : resv.status === "checked-out"
          ? "Checked Out"
          : "Reserved",
          
      totalAmount: resv.totalAmount
    }));

    res.status(200).json(result);

  } catch (error) {
    console.error("Guest Lookup Error:", error);
    res.status(500).json({ message: "Failed to fetch guests" });
  }
};


module.exports = {
  getRoomLookup,
  getGuestLookup
};