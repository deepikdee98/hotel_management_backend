const RoomAdvance = require("../../../../../models/Admin/roomAdvanceModel");
const Checkin = require("../../../../../models/Admin/checkinModel");
const Room = require("../../../../../models/Admin/roomModel");


// @desc    Create Room Advance Payment
// @route   POST /api/admin/frontoffice/reception/room-advance
// @access  Private (Hotel Admin)

const createRoomAdvance = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is missing"
      });
    }

    const {
      roomNumber,
      advanceAmount,
      paymentMode,
      ledgerAccount,
      panNo,
      noOfPrint,
      remarks
    } = req.body;

    if (!roomNumber) {
      return res.status(400).json({
        success: false,
        message: "Room number is required"
      });
    }

    const room = await Room.findById(roomNumber);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    const checkin = await Checkin.findOne({ roomNumber }).sort({ createdAt: -1 });

    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found for this room"
      });
    }

    const advance = await RoomAdvance.create({
      hotelId: req.user.hotelId,
      checkin: checkin._id,
      roomNumber,
      bookingNo: checkin._id,
      guestName: checkin.guestName,
      advanceAmount,
      paymentMode,
      ledgerAccount,
      panNo,
      noOfPrint,
      remarks
    });

    res.status(201).json({
      success: true,
      message: "Room advance recorded successfully",
      data: advance
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to record advance payment"
    });
  }
};



// @desc    Get All Room Advance Records
// @route   GET /api/admin/frontoffice/reception/room-advance
// @access  Private (Hotel Admin)

const getAllRoomAdvances = async (req, res) => {
  try {

    const advances = await RoomAdvance.find({ hotelId: req.user.hotelId })
  .populate({
    path: "roomNumber",
    select: "roomNumber"
  })
  .populate({
    path: "checkin",
    select: "guestName"
  });

const formatted = advances.map(a => ({
  ...a.toObject(),
  roomNumber: a.roomNumber?.roomNumber,
  guestName: a.checkin?.guestName
}));

res.status(200).json({
  success: true,
  count: formatted.length,
  data: formatted
});

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advance records"
    });
  }
};



// @desc    Get Room Advance by ID
// @route   GET /api/admin/frontoffice/reception/room-advance/:id
// @access  Private (Hotel Admin)

const getRoomAdvanceById = async (req, res) => {
  try {

   const advance = await RoomAdvance.findOne({ _id: req.params.id, hotelId: req.user.hotelId })
  .populate({
    path: "roomNumber",
    select: "roomNumber"
  })
  .populate({
    path: "checkin",
    select: "guestName"
  });

if (!advance) {
  return res.status(404).json({
    success: false,
    message: "Advance record not found"
  });
}

const formatted = {
  ...advance.toObject(),
  roomNumber: advance.roomNumber?.roomNumber,
  guestName: advance.checkin?.guestName
};

res.status(200).json({
  success: true,
  data: formatted
});

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advance record"
    });
  }
};


module.exports = {
  createRoomAdvance,
  getAllRoomAdvances,
  getRoomAdvanceById
};