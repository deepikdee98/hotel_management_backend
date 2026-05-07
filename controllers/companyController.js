const asyncHandler = require("express-async-handler");
const Company = require("../models/Admin/companyModel");

const getHotelId = (req) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  return hotelId ? String(hotelId) : "";
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
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  const { name, code, contactPerson, phone, email, address, gstNumber, type, creditAllowed, creditLimit } = req.body;

  if (!hotelId) {
    return res.status(400).json({
      success: false,
      message: "Hotel ID is required",
    });
  }

  if (!name || !code) {
    return res.status(400).json({
      success: false,
      message: "Company name and code are required",
    });
  }

  // Check if code already exists for this hotel
  const existingCompany = await Company.findOne({
    hotelId: String(hotelId),
    code: code.toUpperCase(),
  });

  if (existingCompany) {
    return res.status(409).json({
      success: false,
      message: "Company code already exists for this hotel",
    });
  }

  // Validate credit limit
  if (creditLimit !== undefined && creditLimit < 0) {
    return res.status(400).json({
      success: false,
      message: "Credit limit cannot be negative",
    });
  }

  const company = await Company.create({
    hotelId: String(hotelId),
    name: name.trim(),
    code: code.toUpperCase().trim(),
    contactPerson: contactPerson?.trim(),
    phone: phone?.trim(),
    email: email?.trim(),
    address: address?.trim(),
    gstNumber: gstNumber?.trim(),
    type: type || "Company",
    creditAllowed: creditAllowed || false,
    creditLimit: creditLimit || 0,
    status: true
  });

  res.status(201).json({
    success: true,
    data: company,
    message: "Company created successfully",
  });
});

// Update a company
const updateCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  const { name, code, contactPerson, phone, email, address, gstNumber, type, creditAllowed, creditLimit } = req.body;

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

  // Check if code is being changed and if it conflicts
  if (code && code.toUpperCase() !== company.code) {
    const existingCompany = await Company.findOne({
      hotelId: String(hotelId),
      code: code.toUpperCase(),
      _id: { $ne: id },
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: "Company code already exists for this hotel",
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
  if (name !== undefined) company.name = name.trim();
  if (code !== undefined) company.code = code.toUpperCase().trim();
  if (contactPerson !== undefined) company.contactPerson = contactPerson?.trim();
  if (phone !== undefined) company.phone = phone?.trim();
  if (email !== undefined) company.email = email?.trim();
  if (address !== undefined) company.address = address?.trim();
  if (gstNumber !== undefined) company.gstNumber = gstNumber?.trim();
  if (type !== undefined) company.type = type;
  if (creditAllowed !== undefined) company.creditAllowed = creditAllowed;
  if (creditLimit !== undefined) company.creditLimit = creditLimit;

  await company.save();

  res.status(200).json({
    success: true,
    data: company,
    message: "Company updated successfully",
  });
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