const express = require("express");
const router = express.Router();

const { getDashboard } = require("../../controllers/Admin/dashboardController");

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.get("/", getDashboard);

module.exports = router;