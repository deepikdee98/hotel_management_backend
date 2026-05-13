const express = require("express");
const router = express.Router();

const {
  getHotelConfig,
  updateHotelConfig,
  completeHotelSetup
} = require("../../../../controllers/Admin/FrontOffice/SetUp/hotelConfigController");

const { protect } = require("../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../middleware/roleMiddleware");

router.use(protect);

router.post("/complete-setup", authorizeRoles("hoteladmin"), completeHotelSetup);

router
  .route("/")
  .get(authorizeRoles("hoteladmin", "staff"), getHotelConfig)
  .put(authorizeRoles("hoteladmin"), updateHotelConfig);

module.exports = router;