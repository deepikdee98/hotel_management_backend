const express = require("express");
const router = express.Router();
const {
	loginUser,
	loginSuperAdmin,
	logoutUser,
	refreshToken,
	changePassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.post("/super-admin/login", loginSuperAdmin);
router.post("/refresh", refreshToken);
router.post("/logout", protect, logoutUser);
router.post("/change-password", protect, changePassword);

module.exports = router;