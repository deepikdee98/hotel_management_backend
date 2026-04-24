const express = require("express");
const router = express.Router();

router.use("/check-in", require("./CheckIn/checkinRoutes"));
router.use("/room-advance", require("./RoomAdvance/roomAdvanceRoutes"));
router.use("/shift-room", require("./ShiftRoom/shiftRoomRoutes"));
router.use("/block-room",require("./BlockRoom/blockRoomRoutes"));
router.use("/post-service", require("./PostService/postServiceRoutes"));
router.use("/advance-transfer", require("./AdvanceTransfer/advanceTransferRoutes"));

module.exports = router;