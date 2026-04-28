const express = require('express');
const router = express.Router();

const {
  getRoomLookup,
  getGuestLookup
} = require("../../../controllers/Admin/FrontOffice/lookupsController");

const { protect } = require("../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.get("/rooms", getRoomLookup);
router.get("/guests", getGuestLookup);

module.exports = router;