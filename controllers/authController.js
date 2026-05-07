const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Hotel = require("../models/SuperAdmin/hotelModel");
const jwt = require("jsonwebtoken");
const { checkSubscriptionStatus } = require("../utils/subscriptionHelper");
const { constants } = require("../constants");

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
    { expiresIn: "1h" }
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
    { expiresIn: "7d" }
  );
};

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  let hotel = null;
  let subscription = null;
  
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are mandatory");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password.");
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
    throw new Error("Invalid email or password.");
  }

  const modules = await getEffectiveModules(user);
  const accessToken = buildAccessToken(user, modules);
  const refreshToken = buildRefreshToken(user);

  res.status(200).json({
    message: "Login successful",
    accessToken,
    refreshToken,
    role: user.role,
    modules,
    subscription,
    hotel: hotel
      ? {
          id: hotel._id,
          name: hotel.name,
          expiryDate: hotel.expiryDate,
        }
      : null,
  });
});

// @desc    Super admin login
// @route   POST /auth/super-admin/login
// @access  Public
const loginSuperAdmin = asyncHandler(async (req, res) => {
  console.log("Super admin login attempt");
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are mandatory");
  }

  const user = await User.findOne({ email, role: "superadmin" });

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
  });
});

// @desc    Refresh access token
// @route   POST /auth/refresh
// @access  Public
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

  // Check Hotel Subscription/Status for non-superadmins during refresh
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

// @desc    Change password
// @route   POST /auth/change-password
// @access  Private
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
  // Rotate tokenVersion so old sessions stop working.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

// @desc    Logout user
// @route   POST /auth/logout
// @access  Private

const logoutUser = asyncHandler(async (req, res) => {

  const userId = req.user._id;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // invalidate token
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
};
