const asyncHandler = require("express-async-handler");
const TravelAgent = require("../models/Admin/travelAgentModel");

const getHotelId = (req) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  return hotelId ? String(hotelId) : "";
};

// Get all active travel agents for the hotel
const getTravelAgents = asyncHandler(async (req, res) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const travelAgents = await TravelAgent.find({
    hotelId: String(hotelId),
    status: true,
  }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: travelAgents,
  });
});

// Create a new travel agent
const createTravelAgent = asyncHandler(async (req, res) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  const { name, code, contactPerson, phone, email, address, gstNumber, creditAllowed, creditLimit } = req.body;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: "Travel agent name and code are required",
    });
  }

  // Check if code already exists for this hotel
  const existingTravelAgent = await TravelAgent.findOne({
    hotelId: String(hotelId),
    code: code.toUpperCase(),
  });

  if (existingTravelAgent) {
    return res.status(409).json({
      success: false,
      message: "Travel agent code already exists for this hotel",
    });
  }

  // Validate credit limit
  if (creditLimit !== undefined && creditLimit < 0) {
    return res.status(400).json({
      success: false,
      message: "Credit limit cannot be negative",
    });
  }

  const travelAgent = await TravelAgent.create({
    hotelId: String(hotelId),
    name: name.trim(),
    code: code.toUpperCase().trim(),
    contactPerson: contactPerson?.trim(),
    phone: phone?.trim(),
    email: email?.trim(),
    address: address?.trim(),
    gstNumber: gstNumber?.trim(),
    creditAllowed: creditAllowed || false,
    creditLimit: creditLimit || 0,
    status: true
  });

  res.status(201).json({
    success: true,
    data: travelAgent,
    message: "Travel agent created successfully",
  });
});

// Update a travel agent
const updateTravelAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  const { name, code, contactPerson, phone, email, address, gstNumber, creditAllowed, creditLimit } = req.body;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const travelAgent = await TravelAgent.findOne({
    _id: id,
    hotelId: String(hotelId),
  });

  if (!travelAgent) {
    return res.status(404).json({
      success: false,
      message: "Travel agent not found",
    });
  }

  // Check if code is being changed and if it conflicts
  if (code && code.toUpperCase() !== travelAgent.code) {
    const existingTravelAgent = await TravelAgent.findOne({
      hotelId: String(hotelId),
      code: code.toUpperCase(),
      _id: { $ne: id },
    });

    if (existingTravelAgent) {
      return res.status(409).json({
        success: false,
        message: "Travel agent code already exists for this hotel",
      });
    }
  }

  // Validate credit limit
  if (creditLimit !== undefined && creditLimit < 0) {
    return res.status(400).json({
      success: false,
      message: "Credit limit cannot be negative",
    });
  }

  // Update fields
  if (name !== undefined) travelAgent.name = name.trim();
  if (code !== undefined) travelAgent.code = code.toUpperCase().trim();
  if (contactPerson !== undefined) travelAgent.contactPerson = contactPerson?.trim();
  if (phone !== undefined) travelAgent.phone = phone?.trim();
  if (email !== undefined) travelAgent.email = email?.trim();
  if (address !== undefined) travelAgent.address = address?.trim();
  if (gstNumber !== undefined) travelAgent.gstNumber = gstNumber?.trim();
  if (creditAllowed !== undefined) travelAgent.creditAllowed = creditAllowed;
  if (creditLimit !== undefined) travelAgent.creditLimit = creditLimit;

  await travelAgent.save();

  res.status(200).json({
    success: true,
    data: travelAgent,
    message: "Travel agent updated successfully",
  });
});

// Soft delete a travel agent
const deleteTravelAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const travelAgent = await TravelAgent.findOne({
    _id: id,
    hotelId: String(hotelId),
  });

  if (!travelAgent) {
    return res.status(404).json({
      success: false,
      message: "Travel agent not found",
    });
  }

  // Soft delete by setting status to false
  travelAgent.status = false;
  await travelAgent.save();

  res.status(200).json({
    success: true,
    message: "Travel agent deleted successfully",
  });
});

module.exports = {
  getTravelAgents,
  createTravelAgent,
  updateTravelAgent,
  deleteTravelAgent,
};