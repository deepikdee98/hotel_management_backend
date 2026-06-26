const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const TravelAgent = require("../models/Admin/travelAgentModel");

const getHotelId = (req) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  return hotelId ? String(hotelId) : "";
};

const cleanString = (value) => typeof value === "string" ? value.trim() : "";

const normalizeHotelId = (value) => {
  const hotelId = value?._id || value;
  return hotelId ? String(hotelId) : "";
};

const handleTravelAgentSaveError = (res, error) => {
  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Travel agent code already exists. Please use a different code.",
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors || {})[0]?.message || "Invalid travel agent details",
    });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid travel agent or hotel id",
    });
  }

  return res.status(400).json({
    success: false,
    message: error?.message || "Unable to save travel agent",
  });
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
  const hotelId = normalizeHotelId(req.user?.hotelId || req.query.hotelId || req.body.hotelId);
  const { name, code, contactPerson, phone, email, address, gstNumber, creditAllowed, creditLimit } = req.body;
  const normalizedName = cleanString(name);
  const normalizedCode = cleanString(code).toUpperCase();

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(hotelId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid hotel id",
    });
  }

  if (!normalizedName) {
    return res.status(400).json({
      success: false,
      message: "Travel agent name is required",
    });
  }

  try {
    const existingTravelAgent = normalizedCode
      ? await TravelAgent.findOne({
          hotelId,
          code: normalizedCode,
        })
      : null;

    if (existingTravelAgent) {
      return res.status(409).json({
        success: false,
        message: "Travel agent code already exists for this hotel",
      });
    }

    if (creditLimit !== undefined && Number(creditLimit) < 0) {
      return res.status(400).json({
        success: false,
        message: "Credit limit cannot be negative",
      });
    }

    const travelAgent = await TravelAgent.create({
      hotelId,
      name: normalizedName,
      ...(normalizedCode ? { code: normalizedCode } : {}),
      contactPerson: cleanString(contactPerson),
      phone: cleanString(phone),
      email: cleanString(email),
      address: cleanString(address),
      gstNumber: cleanString(gstNumber),
      creditAllowed: Boolean(creditAllowed),
      creditLimit: Number(creditLimit || 0),
      status: true
    });

    res.status(201).json({
      success: true,
      data: travelAgent,
      message: "Travel agent created successfully",
    });
  } catch (error) {
    return handleTravelAgentSaveError(res, error);
  }
});

// Update a travel agent
const updateTravelAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotelId = normalizeHotelId(req.user?.hotelId || req.query.hotelId || req.body.hotelId);
  const { name, code, contactPerson, phone, email, address, gstNumber, creditAllowed, creditLimit } = req.body;
  const normalizedCode = code !== undefined ? cleanString(code).toUpperCase() : undefined;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(hotelId) || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid travel agent or hotel id",
    });
  }

  try {
    const travelAgent = await TravelAgent.findOne({
      _id: id,
      hotelId,
    });

    if (!travelAgent) {
      return res.status(404).json({
        success: false,
        message: "Travel agent not found",
      });
    }

    if (normalizedCode && normalizedCode !== travelAgent.code) {
      const existingTravelAgent = await TravelAgent.findOne({
        hotelId,
        code: normalizedCode,
        _id: { $ne: id },
      });

      if (existingTravelAgent) {
        return res.status(409).json({
          success: false,
          message: "Travel agent code already exists for this hotel",
        });
      }
    }

    if (creditLimit !== undefined && Number(creditLimit) < 0) {
      return res.status(400).json({
        success: false,
        message: "Credit limit cannot be negative",
      });
    }

    if (name !== undefined) travelAgent.name = cleanString(name);
    if (code !== undefined) travelAgent.code = normalizedCode || undefined;
    if (contactPerson !== undefined) travelAgent.contactPerson = cleanString(contactPerson);
    if (phone !== undefined) travelAgent.phone = cleanString(phone);
    if (email !== undefined) travelAgent.email = cleanString(email);
    if (address !== undefined) travelAgent.address = cleanString(address);
    if (gstNumber !== undefined) travelAgent.gstNumber = cleanString(gstNumber);
    if (creditAllowed !== undefined) travelAgent.creditAllowed = Boolean(creditAllowed);
    if (creditLimit !== undefined) travelAgent.creditLimit = Number(creditLimit || 0);

    await travelAgent.save();

    res.status(200).json({
      success: true,
      data: travelAgent,
      message: "Travel agent updated successfully",
    });
  } catch (error) {
    return handleTravelAgentSaveError(res, error);
  }
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
