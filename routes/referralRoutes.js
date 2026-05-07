const express = require("express");
const router = express.Router();
const {
  getReferrals,
  createReferral,
  updateReferral,
  deleteReferral,
} = require("../controllers/Admin/referralController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.route("/")
  .get(getReferrals)
  .post(createReferral);

router.route("/:id")
  .put(updateReferral)
  .delete(deleteReferral);

module.exports = router;
