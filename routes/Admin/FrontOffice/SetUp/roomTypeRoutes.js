const express = require("express");
const router = express.Router();

const {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  updateRoomTypeStatus
} = require("../../../../controllers/Admin/FrontOffice/SetUp/roomTypeController");

const { protect } = require("../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router
  .route("/")
  .get(getRoomTypes)
  .post(createRoomType);

router
  .route("/:id")
  .put(updateRoomType)
  .delete(deleteRoomType);

router
  .route("/:id/status")
  .patch(updateRoomTypeStatus);

module.exports = router;