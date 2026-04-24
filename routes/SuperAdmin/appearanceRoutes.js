const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const { getAppearance, updateAppearance } = require("../../controllers/SuperAdmin/appearanceController");

router.use(protect, authorizeRoles("superadmin"));

router
  .route("/")
  .get(getAppearance)
  .put(updateAppearance);

module.exports = router;