const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const {
  getProfile,
  updateProfile
} = require("../../controllers/SuperAdmin/profileController");

router.use(protect, authorizeRoles("superadmin"));

router
  .route("/profile")
  .get(getProfile)
  .put(updateProfile);

module.exports = router;