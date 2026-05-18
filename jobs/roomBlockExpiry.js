const cron = require("node-cron");

const expireRoomBlocks = require("../utils/expireRoomBlocks");

const runRoomBlockExpiry = async () => {
  const result = await expireRoomBlocks();

  if (result.expiredBlocks > 0 || result.unblockedRooms > 0) {
    console.log(
      `[RoomBlockExpiry] Expired ${result.expiredBlocks} block(s), unblocked ${result.unblockedRooms} room(s)`
    );
  }

  return result;
};

const startRoomBlockExpiryJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await runRoomBlockExpiry();
    } catch (error) {
      console.error("[RoomBlockExpiry] Scheduled expiry failed", error);
    }
  });
};

module.exports = {
  startRoomBlockExpiryJob,
  runRoomBlockExpiry,
};
