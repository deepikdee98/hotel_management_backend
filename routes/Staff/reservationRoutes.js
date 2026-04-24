const express = require("express");
const router = express.Router();

const {getStaffReservations,createStaffReservation,updateReservationStatus} = require("../../controllers/Staff/reservationController");

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("staff"));

router.get("/", getStaffReservations);
router.post("/", createStaffReservation);
router.patch("/:id/status", updateReservationStatus);


module.exports = router;