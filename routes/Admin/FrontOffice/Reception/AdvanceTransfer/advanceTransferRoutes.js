const express = require("express");
const router = express.Router();
const {
  createAdvanceTransfer,
  getAllAdvanceTransfers,
  getAdvanceTransferById,
  cancelAdvanceTransfer,
} = require("../../../../../controllers/Admin/FrontOffice/Reception/AdvanceTransfer/advanceTransferController");
const { protect } = require("../../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin"));

router.post("/", createAdvanceTransfer);
router.get("/", getAllAdvanceTransfers);
router.get("/:id", getAdvanceTransferById);
router.put("/:id/cancel", cancelAdvanceTransfer);

module.exports = router;
