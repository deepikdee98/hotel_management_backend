const express = require("express");
const router = express.Router();
const {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require("../../controllers/Admin/inventoryController");
const { protect } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { authorizeModule } = require("../../middleware/moduleMiddleware");

router.use(protect, authorizeRoles("hoteladmin"), authorizeModule("inventory"));

router.route("/")
  .get(getInventory)
  .post(createInventoryItem);

router.route("/:id")
  .patch(updateInventoryItem)
  .delete(deleteInventoryItem);

module.exports = router;
