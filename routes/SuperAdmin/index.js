const express = require("express");
const router = express.Router();

router.use("/dashboard", require("./dashboardRoutes"));
router.use("/hotel", require("./hotelRoutes"));
router.use("/hotels", require("./hotelRoutes"));
router.use("/modules", require("./moduleRoutes"));
router.use("/module-requests", require("./moduleRequestRoutes"));
router.use("/notifications", require("./notificationRoutes"));
router.use("/", require("./profileRoutes"));
router.use("/appearance",require("./appearanceRoutes"));
router.use("/security",require('./securityRoutes'))

module.exports = router; 