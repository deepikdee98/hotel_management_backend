const express = require("express");
const router = express.Router();

const {
  getHotelConfig,
  updateHotelConfig
} = require("../../../../controllers/Admin/FrontOffice/SetUp/hotelConfigController");

const { protect } = require("../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin"));

router
  .route("/")
  .get(getHotelConfig)
  .put(updateHotelConfig);

module.exports = router;