const express = require("express");
const router = express.Router();

const {
  blockRoom,
  getBlockedRooms,
  unblockRoom,
} = require("../../../../../controllers/Admin/FrontOffice/Reception/BlockRoom/blockRoomController");

const { protect } = require("../../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));



router.post("/", blockRoom);
router.get("/", getBlockedRooms);
router.put("/unblock/:id", unblockRoom);

module.exports = router;