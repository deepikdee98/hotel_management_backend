const BlockRoom = require("../../../../../models/Admin/blockRoomModel");
const Room = require("../../../../../models/Admin/roomModel");

// @desc    Block a room 
// @route   POST /api/admin/frontoffice/reception/block-room
// @access  Private (Hotel Admin)
const blockRoom = async (req, res) => {
  try {
    const { roomId, from, to, remark } = req.body;

    if (!roomId || !from || !to) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await BlockRoom.findOne({
      room: roomId,
      isActive: true,
      $or: [
        { from: { $lte: to }, to: { $gte: from } }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: "Room already blocked for selected dates" });
    }

    const block = await BlockRoom.create({
      hotelId: req.user.hotelId,
      room: roomId,
      from,
      to,
      remark,
      isActive: true 
    });

    await Room.findByIdAndUpdate(roomId, { status: "blocked" });

    // Populate room details before sending response
    const populatedBlock = await BlockRoom.findById(block._id)
      .populate("room", "roomNumber floor");

    res.status(201).json({ success: true, data: populatedBlock });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Get all blocked rooms with details
// @route   GET /api/admin/frontoffice/reception/block-room
// @access  Private (Hotel Admin)

const getBlockedRooms = async (req, res) => {
  try {
    const data = await BlockRoom.find({ hotelId: req.user.hotelId, isActive: true })
      .populate("room", "roomNumber")
      .sort({ createdAt: -1 });

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Unblock a previously blocked room
// @route   PATCH /api/admin/frontoffice/reception/block-room/:id
// @access  Private (Hotel Admin)
const unblockRoom = async (req, res) => {
  try {
    const block = await BlockRoom.findOne({ _id: req.params.id, hotelId: req.user.hotelId });

    if (!block) {
      return res.status(404).json({ message: "Block not found" });
    }

    block.isActive = false;
    await block.save();

    await Room.findByIdAndUpdate(block.room, { status: "available" });

    res.json({ success: true, message: "Room unblocked" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports ={
  blockRoom,
  getBlockedRooms,
  unblockRoom   
}