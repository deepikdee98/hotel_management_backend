const express = require("express");
const router = express.Router();

const {createGuest, getGuests, updateGuest, deleteGuest} = require("../../controllers/Staff/guestController");

const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("staff", "hoteladmin"));

router.route("/").post(createGuest).get(getGuests);
router.route("/:id").put(updateGuest).delete(deleteGuest);

module.exports = router;