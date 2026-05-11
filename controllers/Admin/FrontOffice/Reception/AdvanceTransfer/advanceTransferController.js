const AdvanceTransfer = require("../../../../../models/Admin/advanceTransferModel");
const RoomAdvance = require("../../../../../models/Admin/roomAdvanceModel");
const Checkin = require("../../../../../models/Admin/checkinModel");
const Room = require("../../../../../models/Admin/roomModel");

// @desc    Create Advance Transfer
// @route   POST /api/admin/frontoffice/reception/advance-transfer
// @access  Private (Hotel Admin)

const createAdvanceTransfer = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is missing",
      });
    }

    const { fromRoom, toRoom, transferAmount, reason, remarks } = req.body;

    // Validate required fields
    if (!fromRoom || !toRoom || !transferAmount || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: fromRoom, toRoom, transferAmount, reason",
      });
    }

    // Validate amount is positive
    if (transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Transfer amount must be greater than 0",
      });
    }

    // Check if source and destination rooms are different
    if (fromRoom === toRoom) {
      return res.status(400).json({
        success: false,
        message: "Source and destination rooms must be different",
      });
    }

    // Find source room and its active check-in
    const fromRoomObj = await Room.findOne({ _id: fromRoom, hotelId: req.user.hotelId });
    if (!fromRoomObj) {
      return res.status(404).json({
        success: false,
        message: "Source room not found",
      });
    }

    const fromCheckinObj = await Checkin.findOne({
      roomNumber: fromRoom,
      status: "active",
    }).sort({ createdAt: -1 });

    if (!fromCheckinObj) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found for source room",
      });
    }

    // Find destination room and its active check-in
    const toRoomObj = await Room.findOne({ _id: toRoom, hotelId: req.user.hotelId });
    if (!toRoomObj) {
      return res.status(404).json({
        success: false,
        message: "Destination room not found",
      });
    }

    const toCheckinObj = await Checkin.findOne({
      roomNumber: toRoom,
      status: "active",
    }).sort({ createdAt: -1 });

    if (!toCheckinObj) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found for destination room",
      });
    }

    // Check if source room has sufficient advance
    const sourceAdvances = await RoomAdvance.find({
      hotelId: req.user.hotelId,
      checkin: fromCheckinObj._id,
    });

    const totalSourceAdvance = sourceAdvances.reduce((sum, adv) => sum + adv.advanceAmount, 0);

    if (totalSourceAdvance < transferAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient advance in source room. Available: ${totalSourceAdvance}, Requested: ${transferAmount}`,
      });
    }

    // Create the transfer record
    const transfer = await AdvanceTransfer.create({
      hotelId: req.user.hotelId,
      fromRoomNumber: fromRoom,
      toRoomNumber: toRoom,
      fromCheckin: fromCheckinObj._id,
      toCheckin: toCheckinObj._id,
      fromGuestName: fromCheckinObj.guestName,
      toGuestName: toCheckinObj.guestName,
      transferAmount,
      reason,
      status: "completed",
      transferredBy: req.user._id,
      remarks,
    });

    // Create a reverse transaction: reduce advance from source, increase to destination
    // Remove advance from source room
    const sourceAdvanceDoc = sourceAdvances[0];
    if (sourceAdvanceDoc) {
      const newAmount = sourceAdvanceDoc.advanceAmount - transferAmount;
      if (newAmount > 0) {
        sourceAdvanceDoc.advanceAmount = newAmount;
        await sourceAdvanceDoc.save();
      } else {
        await RoomAdvance.deleteOne({ _id: sourceAdvanceDoc._id });
      }
    }

    // Add advance to destination room
    const destAdvance = await RoomAdvance.findOne({
      hotelId: req.user.hotelId,
      checkin: toCheckinObj._id,
    });

    if (destAdvance) {
      destAdvance.advanceAmount += transferAmount;
      await destAdvance.save();
    } else {
      await RoomAdvance.create({
        hotelId: req.user.hotelId,
        checkin: toCheckinObj._id,
        roomNumber: toRoom,
        bookingNo: toCheckinObj._id,
        guestName: toCheckinObj.guestName,
        advanceAmount: transferAmount,
        paymentMode: "Other",
        remarks: `Transfer from room ${fromRoomObj.roomNumber}`,
      });
    }

    res.status(201).json({
      success: true,
      message: "Advance transferred successfully",
      data: transfer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create advance transfer",
      error: error.message,
    });
  }
};

// @desc    Get All Advance Transfers
// @route   GET /api/admin/frontoffice/reception/advance-transfer
// @access  Private (Hotel Admin)

const getAllAdvanceTransfers = async (req, res) => {
  try {
    const transfers = await AdvanceTransfer.find({ hotelId: req.user.hotelId })
      .populate({
        path: "fromRoomNumber",
        select: "roomNumber",
      })
      .populate({
        path: "toRoomNumber",
        select: "roomNumber",
      })
      .populate({
        path: "transferredBy",
        select: "name email",
      })
      .sort({ createdAt: -1 });

    const formatted = transfers.map((t) => ({
      ...t.toObject(),
      fromRoom: t.fromRoomNumber?.roomNumber,
      toRoom: t.toRoomNumber?.roomNumber,
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advance transfers",
      error: error.message,
    });
  }
};

// @desc    Get Advance Transfer by ID
// @route   GET /api/admin/frontoffice/reception/advance-transfer/:id
// @access  Private (Hotel Admin)

const getAdvanceTransferById = async (req, res) => {
  try {
    const transfer = await AdvanceTransfer.findOne({
      _id: req.params.id,
      hotelId: req.user.hotelId,
    })
      .populate({
        path: "fromRoomNumber",
        select: "roomNumber",
      })
      .populate({
        path: "toRoomNumber",
        select: "roomNumber",
      })
      .populate({
        path: "transferredBy",
        select: "name email",
      });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Advance transfer record not found",
      });
    }

    const formatted = {
      ...transfer.toObject(),
      fromRoom: transfer.fromRoomNumber?.roomNumber,
      toRoom: transfer.toRoomNumber?.roomNumber,
    };

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch advance transfer",
      error: error.message,
    });
  }
};

// @desc    Cancel Advance Transfer (reverse the transaction)
// @route   PUT /api/admin/frontoffice/reception/advance-transfer/:id/cancel
// @access  Private (Hotel Admin)

const cancelAdvanceTransfer = async (req, res) => {
  try {
    const transfer = await AdvanceTransfer.findOne({
      _id: req.params.id,
      hotelId: req.user.hotelId,
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Advance transfer record not found",
      });
    }

    if (transfer.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Transfer is already cancelled",
      });
    }

    // Reverse the transaction
    // Add amount back to source room
    const sourceAdvance = await RoomAdvance.findOne({
      hotelId: req.user.hotelId,
      checkin: transfer.fromCheckin,
    });

    if (sourceAdvance) {
      sourceAdvance.advanceAmount += transfer.transferAmount;
      await sourceAdvance.save();
    } else {
      const fromRoom = await Room.findOne({ _id: transfer.fromRoomNumber, hotelId: req.user.hotelId });
      const fromCheckin = await Checkin.findOne({ _id: transfer.fromCheckin, hotelId: req.user.hotelId });
      await RoomAdvance.create({
        hotelId: req.user.hotelId,
        checkin: transfer.fromCheckin,
        roomNumber: transfer.fromRoomNumber,
        bookingNo: transfer.fromCheckin,
        guestName: transfer.fromGuestName,
        advanceAmount: transfer.transferAmount,
        paymentMode: "Other",
        remarks: `Reversal of transfer to room ${fromRoom?.roomNumber}`,
      });
    }

    // Reduce from destination room
    const destAdvance = await RoomAdvance.findOne({
      hotelId: req.user.hotelId,
      checkin: transfer.toCheckin,
    });

    if (destAdvance) {
      const newAmount = destAdvance.advanceAmount - transfer.transferAmount;
      if (newAmount > 0) {
        destAdvance.advanceAmount = newAmount;
        await destAdvance.save();
      } else {
        await RoomAdvance.deleteOne({ _id: destAdvance._id });
      }
    }

    // Update transfer status
    transfer.status = "cancelled";
    await transfer.save();

    res.status(200).json({
      success: true,
      message: "Advance transfer cancelled successfully",
      data: transfer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel advance transfer",
      error: error.message,
    });
  }
};

module.exports = {
  createAdvanceTransfer,
  getAllAdvanceTransfers,
  getAdvanceTransferById,
  cancelAdvanceTransfer,
};
