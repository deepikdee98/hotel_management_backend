const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (error) {
  bcrypt = require("bcryptjs");
}

const buildAccessToken = (user) => {
  return jwt.sign(
    {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        hotelId: user.hotelId || null,
        modules: user.modules || [],
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
  
  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are mandatory");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Account is deactivated");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const accessToken = buildAccessToken(user);
  const refreshToken = buildRefreshToken(user);

  res.status(200).json({
    message: "Login successful",
    accessToken,
    refreshToken,
    role: user.role,
    modules: user.modules || [],
  });
});

// @desc    Super admin login
// @route   POST /auth/super-admin/login
// @access  Public
const loginSuperAdmin = asyncHandler(async (req, res) => {
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
    throw new Error("Account is deactivated");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    res.status(401);
    throw new Error("Invalid super admin credentials");
  }

  const accessToken = buildAccessToken(user);
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

  const accessToken = buildAccessToken(user);
  const nextRefreshToken = buildRefreshToken(user);

  res.status(200).json({
    message: "Token refreshed",
    accessToken,
    refreshToken: nextRefreshToken,
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