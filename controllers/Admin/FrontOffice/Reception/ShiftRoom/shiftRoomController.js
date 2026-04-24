const asyncHandler = require("express-async-handler");
const Checkin = require("../../../../../models/Admin/checkinModel");
const Room = require("../../../../../models/Admin/roomModel");
const RoomShift = require("../../../../../models/Admin/roomtransferModel");

// @desc    Shift Room
// @route   POST /admin/reception/shift-room/
// @access  Private (Hotel Admin)

const shiftRoom = asyncHandler(async (req, res) => {

  const {
    checkinId,
    newRoomNumber,
    roomType,
    planType,
    referredBy,
    remark
  } = req.body;



  if (!checkinId || !newRoomNumber) {
    res.status(400);
    throw new Error("Checkin ID and new room are required");
  }

   if (!roomType) {
    res.status(400);
    throw new Error("Room type is required");
  }


  const checkin = await Checkin.findOne({ _id: checkinId, hotelId: req.user.hotelId });

  if (!checkin) {
    res.status(404);
    throw new Error("Check-in not found");
  }

  const newRoom = await Room.findOne({ _id: newRoomNumber, hotelId: req.user.hotelId });

  if (!newRoom) {
    res.status(404);
    throw new Error("New room not found");
  }

  if (newRoom.status === "occupied") {
    res.status(400);
    throw new Error("Selected room already occupied");
  }

 const oldRoom = await Room.findOne({
  _id: checkin.roomNumber,
  hotelId: req.user.hotelId
});
  const oldRoomType = checkin.roomType;

  if (oldRoom) {
    oldRoom.status = "available";
    await oldRoom.save();
  }

  newRoom.status = "occupied";
  await newRoom.save();

  checkin.roomNumber = newRoomNumber;
  checkin.roomType = roomType;
  checkin.planType = planType;

  await checkin.save();

  const shift = await RoomShift.create({
    hotelId: checkin.hotelId,
    checkin: checkin._id,
    oldRoomNumber: oldRoom?._id,
    newRoomNumber,
    oldRoomType,
    newRoomType: roomType,
    planType,
    referredBy,
    remark
  });

  res.status(200).json({
    success: true,
    message: "Room shifted successfully",
    data: shift
  });

});

module.exports = { shiftRoom };