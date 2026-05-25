const User = require("../../models/userModel");

let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (error) {
  bcrypt = require("bcryptjs");
}

const usernameRegex = /^[a-zA-Z0-9_]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const normalizePhone = (phone) => String(phone || "").replace(/\D/g, "");

const buildPhoneRegex = (phone) => new RegExp(`^\\D*${phone.split("").join("\\D*")}\\D*$`);

const validateEmail = (email) => {
  if (!email) return "Email is required";
  if (!emailRegex.test(email)) return "Enter a valid email address";
  return null;
};

const validatePhone = (phone) => {
  if (!phone) return "Phone number is required";

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Phone number must contain 7 to 15 digits";
  }

  return null;
};

const buildDuplicateQuery = ({ hotelId, username, email, phone, excludeUserId }) => {
  const conditions = [];

  if (hotelId && username) conditions.push({ hotelId, username });
  if (email) conditions.push({ email });
  if (phone) {
    conditions.push({ phone });
    conditions.push({ phone: buildPhoneRegex(phone) });
  }

  if (conditions.length === 0) return null;

  const query = { $or: conditions };
  if (excludeUserId) query._id = { $ne: excludeUserId };

  return query;
};

const getDuplicateUserMessage = (user, { username, email, phone }) => {
  if (!user) return null;
  if (username && user.username === username) return "Username already exists";
  if (email && user.email === email) return "Email already exists";
  if (phone && normalizePhone(user.phone) === phone) return "Phone number already exists";
  return "User already exists";
};

// @desc    Create Staff
// @route   POST /admin/staff
// @access  Private (Hotel Admin)
const createStaff = async (req, res) => {
  try {
    const { name, username, email, password, modules, phone, role } = req.body;
    const cleanUsername = String(username || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = normalizePhone(phone);

    if (!cleanUsername || !cleanEmail || !cleanPhone || !password) {
      return res.status(400).json({
        message: "Username, email, phone number and password are required",
      });
    }

    const usernameError = validateUsername(cleanUsername);
    if (usernameError) {
      return res.status(400).json({
        message: usernameError,
      });
    }

    const emailError = validateEmail(cleanEmail);
    if (emailError) {
      return res.status(400).json({
        message: emailError,
      });
    }

    const phoneError = validatePhone(cleanPhone);
    if (phoneError) {
      return res.status(400).json({
        message: phoneError,
      });
    }

    const existingUser = await User.findOne(buildDuplicateQuery({
      hotelId: req.user.hotelId,
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
    }));

    if (existingUser) {
      return res.status(400).json({
        message: getDuplicateUserMessage(existingUser, {
          username: cleanUsername,
          email: cleanEmail,
          phone: cleanPhone,
        }),
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
      phone: cleanPhone,
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

    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({
        message: "Email already exists",
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

    const updateData = { ...req.body };

    if (updateData.username !== undefined) {
      updateData.username = String(updateData.username || "").trim();
      const usernameError = validateUsername(updateData.username);
      if (usernameError) {
        return res.status(400).json({ message: usernameError });
      }
    }

    if (updateData.email !== undefined) {
      updateData.email = String(updateData.email || "").trim().toLowerCase();
      const emailError = validateEmail(updateData.email);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }
    }

    if (updateData.phone !== undefined) {
      updateData.phone = normalizePhone(updateData.phone);
      const phoneError = validatePhone(updateData.phone);
      if (phoneError) {
        return res.status(400).json({ message: phoneError });
      }
    }

    const duplicateQuery = buildDuplicateQuery({
      hotelId: req.user.hotelId,
      username: updateData.username,
      email: updateData.email,
      phone: updateData.phone,
      excludeUserId: req.params.id,
    });
    const existingUser = duplicateQuery ? await User.findOne(duplicateQuery) : null;

    if (existingUser) {
      return res.status(400).json({
        message: getDuplicateUserMessage(existingUser, {
          username: updateData.username,
          email: updateData.email,
          phone: updateData.phone,
        }),
      });
    }

    const updated = await User.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      updateData,
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
