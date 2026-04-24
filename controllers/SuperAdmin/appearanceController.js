const asyncHandler = require("express-async-handler");
const User = require("../../models/userModel");
const { constants } = require("../../constants");


// @desc    Get Appearance
// @route   GET /super-admin/appearance
// @access  Private (Super Admin)

const getAppearance = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(constants.NOT_FOUND);
        throw new Error("User not found");
    }
    res.status(200).json(user.appearance);
});

// @desc    Update Appearance
// @route   PUT /super-admin/appearance
// @access  Private (Super Admin)


const updateAppearance = asyncHandler(async (req, res) => {
    const { theme, language, dateFormat } = req.body

    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(constants.NOT_FOUND);
        throw new Error("User not found");
    }

    if (theme !== undefined) user.appearance.theme = theme;
    if (language !== undefined) user.appearance.language = language;
    if (dateFormat !== undefined) user.appearance.dateFormat = dateFormat;

    await user.save();
    res.status(200).json({
        message: "Appearance updated successfully",
        appearance: user.appearance
    });


})

module.exports = { getAppearance,updateAppearance }
