const express = require("express");
const router = express.Router();

const {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  updateHotelModules,
  updateHotelStatus,
} = require("../../controllers/SuperAdmin/hotelController");

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("superadmin"));

router
  .route("/")
  .post(createHotel)
  .get(getAllHotels);

router
  .route("/:id")
  .get(getHotelById)
  .put(updateHotel)
  .delete(deleteHotel);

router.patch("/:id/modules", updateHotelModules);
router.patch("/:id/status", updateHotelStatus);

module.exports = router;