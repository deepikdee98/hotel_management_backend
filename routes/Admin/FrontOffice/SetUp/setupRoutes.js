const express = require("express");
const router = express.Router();

router.use("/room-types", require("./roomTypeRoutes"));
router.use("/rate-plans", require("./ratePlanRoutes"));
router.use("/service-codes", require("./serviceCodeRoutes"));
router.use("/services", require("./serviceRoutes"));
router.use("/hotel-config", require("./hotelConfigRoutes"));
router.use("/add-room", require("./addRoomRoutes"));

module.exports = router;