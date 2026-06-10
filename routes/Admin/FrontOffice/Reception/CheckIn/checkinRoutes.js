const express = require("express");
const router = express.Router();

const {
  createCheckIn,
  getAllCheckIns,
  getCheckInById,
  getGRCardByRoom,
  updateCheckIn,
  removeLinkedRoomCheckIn
} = require("../../../../../controllers/Admin/FrontOffice/Reception/CheckIn/checkInController");

const { protect } = require("../../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../../middleware/roleMiddleware");
const { createReadUrl, createUploadUrl } = require("../../../../../controllers/uploadController");
const { validateS3UploadRequest } = require("../../../../../middleware/fileUploadValidation");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.post("/uploads/presign", validateS3UploadRequest, createUploadUrl);
router.post("/uploads/read-url", createReadUrl);
router.post("/", createCheckIn);
router.get("/", getAllCheckIns);
router.get("/:id", getCheckInById);
router.put("/:id", updateCheckIn);
router.delete("/:id/linked-room", removeLinkedRoomCheckIn);
router.get("/grcard/:roomId", getGRCardByRoom);

module.exports = router;
