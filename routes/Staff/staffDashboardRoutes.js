const express = require("express");
const router = express.Router();

const { getStaffDashboard } = require("../../controllers/Staff/staffDashboardController");

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("staff"));

router.get("/", getStaffDashboard);

module.exports = router;