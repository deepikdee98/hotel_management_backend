const asyncHandler = require("express-async-handler");
const User = require("../../models/userModel");
const { constants } = require("../../constants");


// @desc    Get Profile
// @route   GET /super-admin/profile
// @access  Private (Super Admin)

const getProfile = asyncHandler(async (req, res) => {

  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    res.status(constants.NOT_FOUND);
    throw new Error("User not found");
  }

  res.status(200).json(user);
});

// @desc  Update Profile
// @route PUT /super-admin/profile
// @access Private (Super Admin)

const updateProfile = asyncHandler(async (req, res) => {

  const { username, email, phone, timezone, avatar } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(constants.NOT_FOUND);
    throw new Error("User not found");
  }
  if (username) user.username = username;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (timezone) user.timezone = timezone;
  if (avatar) user.avatar = avatar;

  const updatedUser = await user.save();

  res.status(200).json({
    message: "Profile updated successfully",
    user: {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      timezone: updatedUser.timezone,
      avatar: updatedUser.avatar,
    }
  });

});





module.exports = { getProfile, updateProfile };