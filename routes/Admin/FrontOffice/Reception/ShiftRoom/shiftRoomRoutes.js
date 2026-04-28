const express = require("express");
const router = express.Router();

const { shiftRoom } = require("../../../../../controllers/Admin/FrontOffice/Reception/ShiftRoom/shiftRoomController");
const { protect } = require("../../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.post("/", shiftRoom);

module.exports = router;