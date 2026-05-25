const asyncHandler = require("express-async-handler");
const Hotel = require("../../models/SuperAdmin/hotelModel");
const User = require("../../models/userModel");
const { constants } = require("../../constants");
const { checkSubscriptionStatus } = require("../../utils/subscriptionHelper");
const { sendHotelAccountEmail } = require("../../utils/email");

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
    return "Admin username is required";
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

const getDuplicateAccountMessage = ({ existingHotelEmail, existingHotelPhone, existingUserEmail, existingUserPhone }) => {
  if (existingHotelEmail || existingUserEmail) return "Email already exists";
  if (existingHotelPhone || existingUserPhone) return "Phone number already exists";
  return "Account already exists";
};

// @desc    Create new hotel
// @route   POST /super-admin/CreateHotel
// @access  Private (Super Admin)
const createHotel = asyncHandler(async (req, res) => {

  const {
    name,
    email,
    phone,
    address,
    city,
    country,
    totalRooms,
    modules,
    adminUsername,
    adminPassword,
    confirmPassword,
    avatar
  } = req.body;
  const cleanAdminUsername = String(adminUsername || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = normalizePhone(phone);

  // Validate required fields
  if (!name || !cleanAdminUsername || !cleanEmail || !cleanPhone || !address || !city || !country || !adminPassword || !confirmPassword) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("All required fields must be filled");
  }

  const usernameError = validateUsername(cleanAdminUsername);
  if (usernameError) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error(usernameError);
  }

  const emailError = validateEmail(cleanEmail);
  if (emailError) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error(emailError);
  }

  const phoneError = validatePhone(cleanPhone);
  if (phoneError) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error(phoneError);
  }

  // Check password match
  if (adminPassword !== confirmPassword) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("Passwords do not match");
  }

  const [
    existingHotelEmail,
    existingHotelPhone,
    existingUserEmail,
    existingUserPhone,
  ] = await Promise.all([
    Hotel.findOne({ email: cleanEmail }),
    Hotel.findOne({ phone: buildPhoneRegex(cleanPhone) }),
    User.findOne({ email: cleanEmail }),
    User.findOne({ phone: buildPhoneRegex(cleanPhone) }),
  ]);

  if (existingHotelEmail || existingHotelPhone || existingUserEmail || existingUserPhone) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error(getDuplicateAccountMessage({
      existingHotelEmail,
      existingHotelPhone,
      existingUserEmail,
      existingUserPhone,
    }));
  }

  // Hash admin password
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Set expiry date to 1 year from now
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  //  Create Hotel
  const hotel = await Hotel.create({
    name,
    email: cleanEmail,
    phone: cleanPhone,
    address,
    city,
    country,
    totalRooms,
    modules,
    isActive: true,
    expiryDate,
    createdBy: req.user._id,
  });

  //  Create Hotel Admin User
  const hotelAdmin = await User.create({
    username: cleanAdminUsername,
    name: `${name} Admin`,
    email: cleanEmail,
    password: hashedPassword,
    role: "hoteladmin",
    hotelId: hotel._id,
    modules: modules || [],
    isActive: true,
    phone: cleanPhone,
    timezone: "",
    avatar: avatar || ""
  });

  let accountEmail = { sent: false };
  try {
    accountEmail = await sendHotelAccountEmail({
      to: cleanEmail,
      hotelName: name,
      username: cleanAdminUsername,
      password: adminPassword,
    });
  } catch (error) {
    accountEmail = {
      sent: false,
      reason: error.message || "Failed to send account email",
    };
    console.error("Failed to send hotel account email:", error);
  }

  res.status(201).json({
    message: "Hotel and Hotel Admin created successfully",
    hotel,
    hotelAdmin,
    accountEmail,
  });

});

// @desc    Get All hotel
// @route   GET /super-admin/hotels
// @access  Private (Super Admin)

const getAllHotels = asyncHandler(async (req, res) => {

  const {
    search,
    status,
    page = 1,
    limit = 10
  } = req.query;

  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { country: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const total = await Hotel.countDocuments(filter);

  const hotels = await Hotel.find(filter)
    .populate("createdBy", "username email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const hotelsWithSubscriptionStatus = hotels.map((hotel) => {
    const hotelObject = hotel.toObject();
    const subscription = checkSubscriptionStatus(hotelObject);

    return {
      ...hotelObject,
      subscriptionStatus: subscription.status,
      subscriptionMessage: subscription.message,
      subscriptionIsValid: subscription.isValid,
      subscriptionDaysLeft: subscription.daysLeft,
    };
  });

  res.status(200).json({
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
    hotels: hotelsWithSubscriptionStatus
  });
});

// @desc    Get hotel by ID
// @route   GET /super-admin/hotel/:id
// @access  Private (Super Admin)
const getHotelById = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id).populate(
    "createdBy",
    "username email"
  );

  if (!hotel) {
    res.status(constants.NOT_FOUND);
    throw new Error("Hotel not found");
  }

  res.status(200).json(hotel);
});

// @desc    Update hotel
// @route   PUT /super-admin/hotel/:id
// @access  Private (Super Admin)

const updateHotel = asyncHandler(async (req, res) => {

  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    res.status(constants.NOT_FOUND);
    throw new Error("Hotel not found");
  }

  const updateData = { ...req.body };

  if (updateData.email !== undefined) {
    updateData.email = String(updateData.email || "").trim().toLowerCase();
    const emailError = validateEmail(updateData.email);
    if (emailError) {
      res.status(constants.VALIDATION_ERROR);
      throw new Error(emailError);
    }
  }

  if (updateData.phone !== undefined) {
    updateData.phone = normalizePhone(updateData.phone);
    const phoneError = validatePhone(updateData.phone);
    if (phoneError) {
      res.status(constants.VALIDATION_ERROR);
      throw new Error(phoneError);
    }
  }

  const duplicateQueries = [];
  if (updateData.email && updateData.email !== hotel.email) {
    duplicateQueries.push(Hotel.findOne({ _id: { $ne: req.params.id }, email: updateData.email }));
    duplicateQueries.push(User.findOne({ email: updateData.email }));
  }
  if (updateData.phone && updateData.phone !== normalizePhone(hotel.phone)) {
    duplicateQueries.push(Hotel.findOne({ _id: { $ne: req.params.id }, phone: buildPhoneRegex(updateData.phone) }));
    duplicateQueries.push(User.findOne({ phone: buildPhoneRegex(updateData.phone) }));
  }

  if (duplicateQueries.length > 0) {
    const duplicates = await Promise.all(duplicateQueries);
    if (duplicates.some(Boolean)) {
      const hasEmailDuplicate = updateData.email && duplicates.some((duplicate) => duplicate?.email === updateData.email);
      res.status(constants.VALIDATION_ERROR);
      throw new Error(hasEmailDuplicate ? "Email already exists" : "Phone number already exists");
    }
  }

  const updatedHotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  res.status(200).json({
    message: "Hotel updated successfully",
    updatedHotel
  });
});

// @desc    Delete hotel
// @route   DELETE /super-admin/hotel/:id
// @access  Private (Super Admin)

const deleteHotel = asyncHandler(async (req, res) => {

  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    res.status(constants.NOT_FOUND);
    throw new Error("Hotel not found");
  }

  await Hotel.findByIdAndDelete(req.params.id);

  // Also delete hotel admin users linked to this hotel
  await User.deleteMany({ hotelId: req.params.id });

  res.status(200).json({
    message: "Hotel deleted successfully"
  });
});

// @desc    Update hotel modules
// @route   PATCH /super-admin/hotels/:id/modules
// @access  Private (Super Admin)
const updateHotelModules = asyncHandler(async (req, res) => {
  const { modules } = req.body;

  if (!Array.isArray(modules)) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("modules must be an array");
  }

  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    res.status(constants.NOT_FOUND);
    throw new Error("Hotel not found");
  }

  hotel.modules = modules;
  await hotel.save();

  res.status(200).json({
    message: "Hotel modules updated successfully",
    hotel,
  });
});

// @desc    Update hotel status
// @route   PATCH /super-admin/hotels/:id/status
// @access  Private (Super Admin)
const updateHotelStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["active", "inactive", "suspended"];

  if (!allowedStatuses.includes(status)) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("Invalid status value");
  }

  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    res.status(constants.NOT_FOUND);
    throw new Error("Hotel not found");
  }

  hotel.status = status;
  await hotel.save();

  res.status(200).json({
    message: "Hotel status updated successfully",
    hotel,
  });
});

// @desc    Extend hotel subscription by 1 year
// @route   PATCH /super-admin/hotels/:id/extend-subscription
// @access  Private (Super Admin)
const extendSubscription = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    res.status(constants.NOT_FOUND);
    throw new Error("Hotel not found");
  }

  // Add 1 year to current expiry date or current date (whichever is later)
  const currentExpiry = new Date(hotel.expiryDate);
  const now = new Date();
  
  const baseDate = currentExpiry > now ? currentExpiry : now;
  const newExpiryDate = new Date(baseDate);
  newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

  hotel.expiryDate = newExpiryDate;
  await hotel.save();

  res.status(200).json({
    message: "Subscription extended successfully by 1 year",
    expiryDate: hotel.expiryDate,
    hotel
  });
});

// @desc    Toggle hotel active status
// @route   PATCH /super-admin/hotels/:id/toggle-active
// @access  Private (Super Admin)
const toggleActiveStatus = asyncHandler(async (req, res) => {
  const hotel = await Hotel.findById(req.params.id);

  if (!hotel) {
    res.status(constants.NOT_FOUND);
    throw new Error("Hotel not found");
  }

  hotel.isActive = !hotel.isActive;
  // Also sync with the old status field if needed
  hotel.status = hotel.isActive ? "active" : "inactive";
  
  await hotel.save();

  res.status(200).json({
    message: `Hotel ${hotel.isActive ? "activated" : "deactivated"} successfully`,
    isActive: hotel.isActive,
    hotel
  });
});

module.exports = {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  updateHotelModules,
  updateHotelStatus,
  extendSubscription,
  toggleActiveStatus,
};
