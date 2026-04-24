const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authorizeModule } = require("../middleware/moduleMiddleware");
const {
  getDashboardReport,
  getOccupancyReport,
  getRevenueReport,
  getGuestReport,
} = require("../controllers/reportsController");

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"), authorizeModule("reports"));

router.get("/dashboard", getDashboardReport);
router.get("/occupancy", getOccupancyReport);
router.get("/revenue", getRevenueReport);
router.get("/guests", getGuestReport);

module.exports = router;
