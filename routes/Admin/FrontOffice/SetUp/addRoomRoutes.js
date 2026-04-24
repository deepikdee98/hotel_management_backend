const express = require("express");
const router = express.Router();

const {addRoom} = require("../../../../controllers/Admin/FrontOffice/SetUp/addroomController");

const { protect } = require("../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin"));

router
  .route("/")
  .post(addRoom);

module.exports = router;