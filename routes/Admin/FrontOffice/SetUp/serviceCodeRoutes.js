const express = require("express");
const router = express.Router();

const {
  getServiceCodes,
  createServiceCode,
  updateServiceCode,
  deleteServiceCode,
  updateServiceCodeStatus
} = require("../../../../controllers/Admin/FrontOffice/SetUp/serviceCodeController");

const { protect } = require("../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin"));

router
  .route("/")
  .get(getServiceCodes)
  .post(createServiceCode);

router
  .route("/:id")
  .put(updateServiceCode)
  .delete(deleteServiceCode);

router
  .route("/:id/status")
  .patch(updateServiceCodeStatus);

module.exports = router;