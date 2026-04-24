const express = require("express");
const router = express.Router();

const {
  createStaff,
  getStaffList,
  staffSummary,
  updateStaff,
  updateStaffStatus,
  deleteStaff,
  resetStaffPassword,
} = require("../../controllers/Admin/staffController");

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "superadmin"));

router.get("/summary", staffSummary);

router
  .route("/")
  .get(getStaffList)
  .post(createStaff);

router
  .route("/:id")
  .put(updateStaff)
  .delete(deleteStaff);

router
  .route("/:id/status")
  .patch(updateStaffStatus);

router.post("/:id/reset-password", resetStaffPassword);

module.exports = router;