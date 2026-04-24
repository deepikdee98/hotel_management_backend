const express = require("express");
const router = express.Router();

const {
  getRatePlans,
  createRatePlan,
  updateRatePlan,
  deleteRatePlan,
  updateRatePlanStatus
} = require('../../../../controllers/Admin/FrontOffice/SetUp/ratePlanController');

const { protect } = require('../../../../middleware/authMiddleware');
const { authorizeRoles } = require('../../../../middleware/roleMiddleware');

router.use(protect, authorizeRoles("hoteladmin"));

router
  .route("/")
  .get(getRatePlans)
  .post(createRatePlan);

router
  .route("/:id")
  .put(updateRatePlan)
  .delete(deleteRatePlan);

router
  .route("/:id/status")
  .patch(updateRatePlanStatus);

module.exports = router;