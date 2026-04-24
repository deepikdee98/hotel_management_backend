const express = require("express");
const router = express.Router();

router.use("/dashboard", require("./adminDashboardRoutes"));
router.use("/staff", require("./staffRoutes"));
router.use("/modules", require("./moduleRoutes"));
router.use("/module-requests", require("./moduleRequestRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/promotions", require("./promotionRoutes"));
router.use("/setup", require("./FrontOffice/SetUp/setupRoutes"));
router.use("/reservations", require("./FrontOffice/reservationRoutes"));
router.use("/lookups", require("./FrontOffice/lookupsRoutes"));
router.use("/reception", require("./FrontOffice/Reception/index"));
router.use("/inventory", require("./inventoryRoutes"));





module.exports = router;