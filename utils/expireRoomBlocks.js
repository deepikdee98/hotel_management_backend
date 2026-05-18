const BlockRoom = require("../models/Admin/blockRoomModel");
const Room = require("../models/Admin/roomModel");

const expireRoomBlocks = async ({ hotelId, now = new Date() } = {}) => {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const expiredFilter = {
    isActive: true,
    to: { $lt: todayStart },
  };

  if (hotelId) {
    expiredFilter.hotelId = hotelId;
  }

  const expiredBlocks = await BlockRoom.find(expiredFilter)
    .select("_id room")
    .lean();

  if (expiredBlocks.length === 0) {
    return { expiredBlocks: 0, unblockedRooms: 0 };
  }

  const blockIds = expiredBlocks.map((block) => block._id);
  const roomIds = [...new Set(expiredBlocks.map((block) => String(block.room)))];

  await BlockRoom.updateMany(
    { _id: { $in: blockIds } },
    { $set: { isActive: false } }
  );

  const stillActiveFilter = {
    isActive: true,
    room: { $in: roomIds },
    to: { $gte: todayStart },
  };

  if (hotelId) {
    stillActiveFilter.hotelId = hotelId;
  }

  const stillActiveBlocks = await BlockRoom.find(stillActiveFilter)
    .select("room")
    .lean();
  const stillBlockedRoomIds = new Set(stillActiveBlocks.map((block) => String(block.room)));
  const roomIdsToUnblock = roomIds.filter((roomId) => !stillBlockedRoomIds.has(roomId));

  if (roomIdsToUnblock.length === 0) {
    return { expiredBlocks: expiredBlocks.length, unblockedRooms: 0 };
  }

  const roomFilter = {
    _id: { $in: roomIdsToUnblock },
    status: "blocked",
  };

  if (hotelId) {
    roomFilter.hotelId = hotelId;
  }

  const result = await Room.updateMany(roomFilter, { $set: { status: "available" } });

  return {
    expiredBlocks: expiredBlocks.length,
    unblockedRooms: result.modifiedCount || 0,
  };
};

module.exports = expireRoomBlocks;
