const User = require("../../models/userModel");

let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (error) {
  bcrypt = require("bcryptjs");
}

const usernameRegex = /^[a-zA-Z0-9_]+$/;

const validateUsername = (username) => {
  if (!username) {
    return "Username is required";
  }

  if (username.length < 4) {
    return "Username must be at least 4 characters";
  }

  if (!usernameRegex.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }

  return null;
};

// @desc    Create Staff
// @route   POST /admin/staff
// @access  Private (Hotel Admin)
const createStaff = async (req, res) => {
  try {
    const { name, username, email, password, modules, phone, role } = req.body;
    const cleanUsername = String(username || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password) {
      return res.status(400).json({
        message: "Username, email and password are required",
      });
    }

    const usernameError = validateUsername(cleanUsername);
    if (usernameError) {
      return res.status(400).json({
        message: usernameError,
      });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });

    if (existingEmail) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const existingUsername = await User.findOne({
      hotelId: req.user.hotelId,
      username: cleanUsername,
    });

    if (existingUsername) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === "hoteladmin" ? "hoteladmin" : "staff";

    const staff = await User.create({
      username: cleanUsername,
      name: String(name || "").trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: userRole,
      phone,
      modules,
      hotelId: req.user.hotelId,
    });

    res.status(201).json({
      message: "Staff created successfully",
      staff,
    });

  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.username) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create staff",
      error: error.message
    });
  }
};



// @desc    Get Staff List
// @route   GET /admin/staff
// @access  Private (Hotel Admin)
const getStaffList = async (req, res) => {
  try {
    const { search, role } = req.query;

    let query = { hotelId: req.user.hotelId };

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    const staff = await User.find(query).select("-password");

    res.json(staff);

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch staff list",
      error: error.message
    });
  }
};



// @desc    Staff Summary
// @route   GET /admin/staff/summary
// @access  Private (Hotel Admin)
const staffSummary = async (req, res) => {
  try {

    const totalStaff = await User.countDocuments({
      hotelId: req.user.hotelId,
    });

    const activeStaff = await User.countDocuments({
      hotelId: req.user.hotelId,
      isActive: true,
    });

    const admins = await User.countDocuments({
      hotelId: req.user.hotelId,
      role: "hoteladmin",
    });

    res.json({
      totalStaff,
      activeStaff,
      admins,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch staff summary",
      error: error.message
    });
  }
};



// @desc    Update Staff
// @route   PUT /admin/staff/:id
// @access  Private (Hotel Admin)
const updateStaff = async (req, res) => {
  try {

    const staff = await User.findOne({ _id: req.params.id, hotelId: req.user.hotelId });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    const updated = await User.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      req.body,
      { new: true }
    ).select("-password");

    res.json({
      message: "Staff updated successfully",
      updated,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update staff",
      error: error.message
    });
  }
};



// @desc    Update Staff Status
// @route   PATCH /admin/staff/:id/status
// @access  Private (Hotel Admin)
const updateStaffStatus = async (req, res) => {
  try {

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const staff = await User.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      { isActive },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    res.json({
      message: "Staff status updated",
      staff,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update staff status",
      error: error.message
    });
  }
};



// @desc    Delete Staff
// @route   DELETE /admin/staff/:id
// @access  Private (Hotel Admin)
const deleteStaff = async (req, res) => {
  try {

    const staff = await User.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    res.json({
      message: "Staff deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete staff",
      error: error.message
    });
  }
};

// @desc    Reset Staff Password
// @route   POST /admin/staff/:id/reset-password
// @access  Private (Hotel Admin)
const resetStaffPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        message: "newPassword is required",
      });
    }

    const staff = await User.findOne({ _id: req.params.id, hotelId: req.user.hotelId });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    if (String(staff.hotelId) !== String(req.user.hotelId)) {
      return res.status(403).json({
        message: "You can reset password only for your hotel staff",
      });
    }

    staff.password = await bcrypt.hash(newPassword, 10);
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();

    res.json({
      message: "Staff password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to reset staff password",
      error: error.message,
    });
  }
};


module.exports = {
  createStaff,
  getStaffList,
  staffSummary,
  updateStaff,
  updateStaffStatus,
  deleteStaff,
  resetStaffPassword,
};
