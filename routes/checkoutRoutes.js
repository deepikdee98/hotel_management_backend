const express = require("express");
const asyncHandler = require("express-async-handler");
const { completeCheckout, downloadCheckoutInvoice } = require("../controllers/checkoutController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authorizeModule } = require("../middleware/moduleMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"), authorizeModule("front-office"));

router.post("/check-out", asyncHandler(completeCheckout));
router.get("/check-out/invoices/:invoiceId/download", asyncHandler(downloadCheckoutInvoice));

module.exports = router;
