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
const { authRateLimiter } = require("../middleware/rateLimiter");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 *
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - identifier
 *         - password
 *       properties:
 *         identifier:
 *           type: string
 *           description: User email, username, or phone number.
 *           example: admin@example.com
 *         email:
 *           type: string
 *           description: Optional email login field. Use identifier when possible.
 *           example: admin@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User password.
 *           example: Admin@123
 *     LoginSuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Login successful
 *         accessToken:
 *           type: string
 *           description: JWT access token.
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token.
 *         role:
 *           type: string
 *           example: hoteladmin
 *         username:
 *           type: string
 *           example: hoteladmin
 *         modules:
 *           type: array
 *           items:
 *             type: string
 *           example: ["front-office", "accounts"]
 *         subscription:
 *           type: object
 *           nullable: true
 *           description: Hotel subscription status for non-superadmin users.
 *         hotel:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               example: 65a1234567890abcdef12345
 *             name:
 *               type: string
 *               example: Grand Palace Hotel
 *             expiryDate:
 *               type: string
 *               format: date-time
 *             isSetupCompleted:
 *               type: boolean
 *               example: true
 *         needsSetup:
 *           type: boolean
 *           example: false
 *     SuperAdminLoginSuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Super admin login successful
 *         accessToken:
 *           type: string
 *           description: JWT access token.
 *         refreshToken:
 *           type: string
 *           description: JWT refresh token.
 *         role:
 *           type: string
 *           example: superadmin
 *         username:
 *           type: string
 *           example: superadmin
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: Error
 *         message:
 *           type: string
 *           example: Invalid credentials
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a hotel admin, staff user, guest user, or other non-restricted account using email, username, or phone number.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             usingIdentifier:
 *               summary: Login with identifier
 *               value:
 *                 identifier: admin@example.com
 *                 password: Admin@123
 *             usingEmail:
 *               summary: Login with email
 *               value:
 *                 email: admin@example.com
 *                 password: Admin@123
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       400:
 *         description: Missing username/email and password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account inactive or hotel subscription is not valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many login attempts.
 */
router.post("/login", authRateLimiter, loginUser);

/**
 * @swagger
 * /auth/super-admin/login:
 *   post:
 *     summary: Login super admin
 *     description: Authenticates a super admin using email or username.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             identifier: superadmin@example.com
 *             password: SuperAdmin@123
 *     responses:
 *       200:
 *         description: Super admin login successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuperAdminLoginSuccessResponse'
 *       400:
 *         description: Missing username/email and password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid super admin credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Super admin account is inactive.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many login attempts.
 */
router.post("/super-admin/login", authRateLimiter, loginSuperAdmin);
router.post("/refresh", refreshToken);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/verify-otp", authRateLimiter, verifyOtp);
router.post("/reset-password", authRateLimiter, resetPassword);
router.post("/logout", protect, logoutUser);
router.post("/change-password", protect, changePassword);

module.exports = router;
