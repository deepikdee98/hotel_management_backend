const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  getSetupOptions,
  createSetupOption,
  updateSetupOption,
  deactivateSetupOption,
} = require("../controllers/setupOptionController");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.get("/:type", getSetupOptions);
router.post("/", adminOnly, createSetupOption);
router.put("/:id", adminOnly, updateSetupOption);
router.patch("/:id/deactivate", adminOnly, deactivateSetupOption);

function adminOnly(req, res, next) {
  return authorizeRoles("hoteladmin")(req, res, next);
}

module.exports = router;
