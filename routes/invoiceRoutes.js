const express = require("express");
const asyncHandler = require("express-async-handler");

const { downloadCheckoutInvoice } = require("../controllers/checkoutController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"));

router.get("/:id/download", asyncHandler(downloadCheckoutInvoice));

module.exports = router;
