const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Hotel = require("../models/SuperAdmin/hotelModel");
const jwt = require("jsonwebtoken");
const { checkSubscriptionStatus } = require("../utils/subscriptionHelper");
const { constants } = require("../constants");
const { sendOtpEmail } = require("../utils/email");
const { generateOtp } = require("../utils/otp");
const { sendOtpSms } = require("../utils/sms");

let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (error) {
  bcrypt = require("bcryptjs");
}

const getEffectiveModules = async (user) => {
  if (user.role === "superadmin") {
    return Array.isArray(user.modules) ? user.modules : [];
  }

  if (!user.hotelId) {
    return Array.isArray(user.modules) ? user.modules : [];
  }

  const hotel = await Hotel.findById(user.hotelId).select("modules").lean();
  const hotelModules = Array.isArray(hotel?.modules) ? hotel.modules : [];

  if (user.role === "hoteladmin") {
    return hotelModules;
  }

  const userModules = Array.isArray(user.modules) ? user.modules : [];
  return userModules.filter((moduleName) => hotelModules.includes(moduleName));
};

const buildAccessToken = (user, modules) => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
  }
  return jwt.sign(
    {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        hotelId: user.hotelId || null,
        modules,
        tokenVersion: user.tokenVersion,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );
};

const buildRefreshToken = (user) => {
  return jwt.sign(
    {
      user: {
        id: user._id,
        tokenVersion: user.tokenVersion,
      },
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "30d" }
  );
};

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, email, password } = req.body;
  const loginIdentifier = String(identifier || email || "").trim();
  let hotel = null;
  let subscription = null;
  
  if (!loginIdentifier || !password) {
    res.status(400);
    throw new Error("Username/email and password are mandatory");
  }

  const user = await User.findOne({
    $or: [
      { email: loginIdentifier },
      { username: loginIdentifier },
      { phone: loginIdentifier },
    ],
  });

  if (!user) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Your account has been deactivated. Please contact Super Admin.");
  }

  // Check Hotel Subscription/Status for non-superadmins
  if (user.role !== 'superadmin' && user.hotelId) {
    hotel = await Hotel.findById(user.hotelId);
    subscription = checkSubscriptionStatus(hotel);

    if (!subscription.isValid) {
      res.status(403);
      throw new Error(subscription.message);
    }
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const modules = await getEffectiveModules(user);
  const accessToken = buildAccessToken(user, modules);
  const refreshToken = buildRefreshToken(user);

  res.status(200).json({
    message: "Login successful",
    accessToken,
    refreshToken,
    role: user.role,
    username: user.username,
    modules,
    subscription,
    hotel: hotel
      ? {
          id: hotel._id,
          name: hotel.name,
          expiryDate: hotel.expiryDate,
          isSetupCompleted: hotel.isSetupCompleted,
        }
      : null,
    needsSetup: user.role === "hoteladmin" && hotel && !hotel.isSetupCompleted ? true : false,
  });
});

const loginSuperAdmin = asyncHandler(async (req, res) => {
  const { identifier, email, password } = req.body;
  const loginIdentifier = String(identifier || email || "").trim();

  if (!loginIdentifier || !password) {
    res.status(400);
    throw new Error("Username/email and password are mandatory");
  }

  const user = await User.findOne({
    role: "superadmin",
    $or: [
      { email: loginIdentifier },
      { username: loginIdentifier },
    ],
  });

  if (!user) {
    res.status(401);
    throw new Error("Invalid super admin credentials");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Your account has been deactivated. Please contact Super Admin.");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    res.status(401);
    throw new Error("Invalid super admin credentials");
  }

  const modules = await getEffectiveModules(user);
  const accessToken = buildAccessToken(user, modules);
  const refreshToken = buildRefreshToken(user);

  res.status(200).json({
    message: "Super admin login successful",
    accessToken,
    refreshToken,
    role: user.role,
    username: user.username,
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400);
    throw new Error("refreshToken is required");
  }

  const decoded = jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET
  );

  const user = await User.findById(decoded.user.id);

  if (!user || decoded.user.tokenVersion !== user.tokenVersion) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  let subscription = null;
  if (user.role !== 'superadmin' && user.hotelId) {
    const hotel = await Hotel.findById(user.hotelId);
    subscription = checkSubscriptionStatus(hotel);

    if (!subscription.isValid) {
      res.status(403);
      throw new Error(subscription.message);
    }
  }

  const modules = await getEffectiveModules(user);
  const accessToken = buildAccessToken(user, modules);
  const nextRefreshToken = buildRefreshToken(user);

  res.status(200).json({
    message: "Token refreshed",
    accessToken,
    refreshToken: nextRefreshToken,
    subscription,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400);
    throw new Error("All fields are mandatory");
  }

  if (newPassword !== confirmPassword) {
    res.status(400);
    throw new Error("New password and confirm password do not match");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

// @desc    Request password reset OTP
// @route   POST /auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, mobileNumber, identifier } = req.body;
  const input = String(identifier || email || mobileNumber || "").trim();

  if (!input) {
    res.status(400);
    throw new Error("Email, username or mobile number is required");
  }

  const user = await User.findOne({
    $or: [
      { email: input.toLowerCase() },
      { username: input },
      { phone: input },
    ],
  });

  if (!user || !user.isActive) {
    // Return success even if user not found for security
    return res.status(200).json({
      success: true,
      message: "If an account exists, an OTP has been sent.",
    });
  }

  const otp = generateOtp();
  console.log("-----------------------------------------");
  console.log(`NEW OTP GENERATED: ${otp}`);
  console.log("-----------------------------------------");
  user.resetOtp = otp;
  user.resetOtpExpire = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  user.resetOtpVerified = false;
  await user.save();

  let sent = false;
  // If the input was specifically a phone number or the user ONLY has a phone number
  if ((/^\d+$/.test(input) && input.length >= 10) || (!user.email && user.phone)) {
    const result = await sendOtpSms({ to: user.phone, otp });
    sent = result.sent;
  } else {
    // Default to email if available
    const result = await sendOtpEmail({ to: user.email, otp });
    sent = result.sent;
  }

  if (!sent) {
    res.status(500);
    throw new Error("Failed to send OTP. Please try again later.");
  }

  res.status(200).json({
    success: true,
    message: "OTP has been sent to your registered email or mobile number.",
  });
});

// @desc    Verify OTP for password reset
// @route   POST /auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, mobileNumber, identifier, otp } = req.body;
  const input = String(identifier || email || mobileNumber || "").trim();

  if (!input || !otp) {
    res.status(400);
    throw new Error("Identifier and OTP are required");
  }

  const user = await User.findOne({
    $or: [
      { email: input.toLowerCase() },
      { username: input },
      { phone: input },
    ],
    resetOtp: otp,
    resetOtpExpire: { $gt: new Date() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired OTP");
  }

  user.resetOtpVerified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully. You can now reset your password.",
  });
});

// @desc    Reset password using OTP verification
// @route   POST /auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, mobileNumber, identifier, password, confirmPassword } = req.body;
  const input = String(identifier || email || mobileNumber || "").trim();

  if (!password || !confirmPassword) {
    res.status(400);
    throw new Error("Password and confirm password are required");
  }

  if (password !== confirmPassword) {
    res.status(400);
    throw new Error("Passwords do not match");
  }

  if (String(password).length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const user = await User.findOne({
    $or: [
      { email: input.toLowerCase() },
      { username: input },
      { phone: input },
    ],
    resetOtpVerified: true,
  });

  if (!user) {
    res.status(400);
    throw new Error("Unauthorized password reset request");
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetOtp = null;
  user.resetOtpExpire = null;
  user.resetOtpVerified = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Logout successful"
  });
});

module.exports = {
  loginUser,
  loginSuperAdmin,
  logoutUser,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
