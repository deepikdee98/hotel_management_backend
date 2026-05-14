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

  // Validate required fields
  if (!name || !cleanAdminUsername || !cleanEmail || !phone || !address || !city || !country || !adminPassword || !confirmPassword) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("All required fields must be filled");
  }

  const usernameError = validateUsername(cleanAdminUsername);
  if (usernameError) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error(usernameError);
  }

  // Check password match
  if (adminPassword !== confirmPassword) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("Passwords do not match");
  }

  // Check if hotel already exists
  const existingHotel = await Hotel.findOne({ email: cleanEmail });
  if (existingHotel) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("Hotel already exists");
  }

  const existingUserEmail = await User.findOne({ email: cleanEmail });
  if (existingUserEmail) {
    res.status(constants.VALIDATION_ERROR);
    throw new Error("User already exists");
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
    phone,
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
    phone: phone || "",
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

  const updatedHotel = await Hotel.findByIdAndUpdate(
    req.params.id,
    req.body,
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
