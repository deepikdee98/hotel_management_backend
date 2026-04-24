const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const {
  changePassword,
  updateSecuritySettings,
  getSecuritySettings
} = require("../../controllers/SuperAdmin/securityController");

router.use(protect, authorizeRoles("superadmin"));

router.put("/change-password", changePassword);
router.post("/change-password", changePassword);

router
  .route("/")
  .put(updateSecuritySettings)
  .get(getSecuritySettings);

module.exports = router;