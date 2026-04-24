const express = require("express");
const router = express.Router();

router.use("/reservations", require("./reservationRoutes"));
router.use("/guests", require("./guestRoutes"));
router.use("/dashboard", require("./staffDashboardRoutes"));

module.exports = router;