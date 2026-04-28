const express = require("express");
const router = express.Router();

const {
  createCheckIn,
  getAllCheckIns,
  getCheckInById,
  getGRCardByRoom,
  updateCheckIn
} = require("../../../../../controllers/Admin/FrontOffice/Reception/CheckIn/checkInController");

const { protect } = require("../../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.post("/", createCheckIn);
router.get("/", getAllCheckIns);
router.get("/:id", getCheckInById);
router.put("/:id", updateCheckIn);
router.get("/grcard/:roomId", getGRCardByRoom);

module.exports = router;