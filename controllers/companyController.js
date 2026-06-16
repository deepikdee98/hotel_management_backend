const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Company = require("../models/Admin/companyModel");

const getHotelId = (req) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  return hotelId ? String(hotelId) : "";
};

const cleanString = (value) => typeof value === "string" ? value.trim() : "";

const normalizeHotelId = (value) => {
  const hotelId = value?._id || value;
  return hotelId ? String(hotelId) : "";
};

const handleCompanySaveError = (res, error) => {
  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Company code already exists. Please use a different code.",
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors || {})[0]?.message || "Invalid company details",
    });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid company or hotel id",
    });
  }

  return res.status(400).json({
    success: false,
    message: error?.message || "Unable to save company",
  });
};

// Get all active companies for the hotel
const getCompanies = asyncHandler(async (req, res) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const companies = await Company.find({
    hotelId: String(hotelId),
    status: true,
  }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: companies,
  });
});

// Create a new company
const createCompany = asyncHandler(async (req, res) => {
  const hotelId = normalizeHotelId(req.user?.hotelId || req.query.hotelId || req.body.hotelId);
  const { name, code, contactPerson, phone, email, address, gstNumber, type, creditAllowed, creditLimit } = req.body;
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

  if (!normalizedName || !normalizedCode) {
    return res.status(400).json({
      success: false,
      message: "Company name and code are required",
    });
  }

  try {
    const existingCompany = await Company.findOne({
      hotelId,
      code: normalizedCode,
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: "Company code already exists for this hotel",
      });
    }

    if (creditLimit !== undefined && Number(creditLimit) < 0) {
      return res.status(400).json({
        success: false,
        message: "Credit limit cannot be negative",
      });
    }

    const company = await Company.create({
      hotelId,
      name: normalizedName,
      code: normalizedCode,
      contactPerson: cleanString(contactPerson),
      phone: cleanString(phone),
      email: cleanString(email),
      address: cleanString(address),
      gstNumber: cleanString(gstNumber),
      type: type || "Company",
      creditAllowed: Boolean(creditAllowed),
      creditLimit: Number(creditLimit || 0),
      status: true
    });

    res.status(201).json({
      success: true,
      data: company,
      message: "Company created successfully",
    });
  } catch (error) {
    return handleCompanySaveError(res, error);
  }
});

// Update a company
const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotelId = normalizeHotelId(req.user?.hotelId || req.query.hotelId || req.body.hotelId);
  const { name, code, contactPerson, phone, email, address, gstNumber, type, creditAllowed, creditLimit } = req.body;
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
      message: "Invalid company or hotel id",
    });
  }

  try {
    const company = await Company.findOne({
      _id: id,
      hotelId,
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (normalizedCode && normalizedCode !== company.code) {
      const existingCompany = await Company.findOne({
        hotelId,
        code: normalizedCode,
        _id: { $ne: id },
      });

      if (existingCompany) {
        return res.status(409).json({
          success: false,
          message: "Company code already exists for this hotel",
        });
      }
    }

    if (creditLimit !== undefined && Number(creditLimit) < 0) {
      return res.status(400).json({
        success: false,
        message: "Credit limit cannot be negative",
      });
    }

    if (name !== undefined) company.name = cleanString(name);
    if (code !== undefined) company.code = normalizedCode;
    if (contactPerson !== undefined) company.contactPerson = cleanString(contactPerson);
    if (phone !== undefined) company.phone = cleanString(phone);
    if (email !== undefined) company.email = cleanString(email);
    if (address !== undefined) company.address = cleanString(address);
    if (gstNumber !== undefined) company.gstNumber = cleanString(gstNumber);
    if (type !== undefined) company.type = type;
    if (creditAllowed !== undefined) company.creditAllowed = Boolean(creditAllowed);
    if (creditLimit !== undefined) company.creditLimit = Number(creditLimit || 0);

    await company.save();

    res.status(200).json({
      success: true,
      data: company,
      message: "Company updated successfully",
    });
  } catch (error) {
    return handleCompanySaveError(res, error);
  }
});

// Soft delete a company
const deleteCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  const company = await Company.findOne({
    _id: id,
    hotelId: String(hotelId),
  });

  if (!company) {
    return res.status(404).json({
      success: false,
      message: "Company not found",
    });
  }

  // Soft delete by setting status to false
  company.status = false;
  await company.save();

  res.status(200).json({
    success: true,
    message: "Company deleted successfully",
  });
});

module.exports = {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
};
