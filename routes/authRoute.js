const express = require("express");
const router = express.Router();
const {
	loginUser,
	loginSuperAdmin,
	logoutUser,
	refreshToken,
	changePassword,
	forgotPassword,
	verifyOtp,
	resetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/securityMiddleware");

router.post("/login", authLimiter, loginUser);
router.post("/super-admin/login", authLimiter, loginSuperAdmin);
router.post("/refresh", refreshToken);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/verify-otp", authLimiter, verifyOtp);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/logout", protect, logoutUser);
router.post("/change-password", protect, changePassword);

module.exports = router;
