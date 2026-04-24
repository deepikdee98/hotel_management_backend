const asyncHandler = require("express-async-handler");
const User = require("../../models/userModel");
const { constants } = require("../../constants");

let bcrypt;
try {
    bcrypt = require("bcrypt");
} catch (error) {
    bcrypt = require("bcryptjs");
}

// @desc    Change user password
// @route   PUT /super-admin/security/change-password
// @access  Private (Super Admin)

const changePassword = asyncHandler(async (req, res) => {

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
        res.status(constants.VALIDATION_ERROR);
        throw new Error("All fields (currentPassword, newPassword, confirmPassword) are mandatory");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(constants.NOT_FOUND);
        throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
        res.status(constants.UNAUTHORIZED);
        throw new Error("Current password is incorrect");
    }

    if (newPassword !== confirmPassword) {
        res.status(constants.VALIDATION_ERROR);
        throw new Error("Passwords do not match");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Rotate tokenVersion so old sessions stop working.
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    res.status(200).json({
        success: true,
        message: "Password updated successfully"
    });

});


// @desc    updateSecurity
// @route   PUT /super-admin/security
// @access  Private (Super Admin)

const updateSecuritySettings = asyncHandler(async (req, res) => {

    const { twoFactorEnabled, sessionTimeout } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(constants.NOT_FOUND);
        throw new Error("User not found");
    }

    if (twoFactorEnabled !== undefined)
        user.security.twoFactorEnabled = twoFactorEnabled;

    if (sessionTimeout !== undefined)
        user.security.sessionTimeout = sessionTimeout;

    await user.save();

    res.status(200).json({
        message: "Security settings updated successfully",
        security: user.security
    });

});

// @desc    Get Security
// @route   get /super-admin/security
// @access  Private (Super Admin)

const getSecuritySettings = asyncHandler(async (req, res) => {

    const user = await User.findById(req.user._id).select("security");

    if (!user) {
        res.status(constants.NOT_FOUND);
        throw new Error("User not found");
    }
    res.status(200).json(user.security);
});




module.exports = { changePassword, updateSecuritySettings, getSecuritySettings }