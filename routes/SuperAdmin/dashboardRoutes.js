const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const { getDashboardStats } = require("../../controllers/SuperAdmin/dashboardController");

router.use(protect, authorizeRoles("superadmin"));

router.get("/stats", getDashboardStats);

module.exports = router;