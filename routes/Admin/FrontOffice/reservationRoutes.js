const express = require("express");
const router = express.Router();

const {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  updateReservationStatus
} = require("../../../controllers/Admin/FrontOffice/Reservation/reservationController");

const { protect } = require("../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router
  .route("/")
  .get(getReservations)
  .post(createReservation);

router
  .route("/:id")
  .put(updateReservation)
  .delete(deleteReservation);

router
  .route("/:id/status")
  .patch(updateReservationStatus);

module.exports = router;