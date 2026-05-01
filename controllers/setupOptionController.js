const asyncHandler = require("express-async-handler");
const SetupOption = require("../models/Admin/setupOptionModel");

const getHotelId = (req) => {
  const hotelId = req.user?.hotelId || req.query.hotelId || req.body.hotelId;
  return hotelId ? String(hotelId) : "";
};

const sendDuplicate = (res) =>
  res.status(409).json({
    success: false,
    message: "This setup value already exists for the selected type",
  });

const getSetupOptions = asyncHandler(async (req, res) => {
  const hotelId = getHotelId(req);
  const { type } = req.params;
  const includeInactive = req.query.includeInactive === "true";

  const query = {
    hotelId,
    type,
    ...(includeInactive ? {} : { isActive: true }),
  };

  const options = await SetupOption.find(query).sort({ value: 1 });

  res.status(200).json({
    success: true,
    data: options,
  });
});

const createSetupOption = asyncHandler(async (req, res) => {
  const hotelId = getHotelId(req);
  const { module, type, value } = req.body;

  if (!hotelId || !module || !type || !value || !String(value).trim()) {
    return res.status(400).json({
      success: false,
      message: "hotelId, module, type, and value are required",
    });
  }

  try {
    const option = await SetupOption.create({
      hotelId,
      module,
      type,
      value,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      metadata: req.body.metadata || {},
    });

    res.status(201).json({
      success: true,
      message: "Setup option created",
      data: option,
    });
  } catch (error) {
    if (error.code === 11000) return sendDuplicate(res);
    throw error;
  }
});

const updateSetupOption = asyncHandler(async (req, res) => {
  const hotelId = getHotelId(req);
  const { id } = req.params;
  const updates = {};

  ["module", "type", "value", "isActive", "metadata"].forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const option = await SetupOption.findOne({ _id: id, hotelId }).select("+normalizedValue");
  if (!option) {
    return res.status(404).json({
      success: false,
      message: "Setup option not found",
    });
  }

  option.set(updates);

  try {
    await option.save();
    res.status(200).json({
      success: true,
      message: "Setup option updated",
      data: option,
    });
  } catch (error) {
    if (error.code === 11000) return sendDuplicate(res);
    throw error;
  }
});

const deactivateSetupOption = asyncHandler(async (req, res) => {
  const hotelId = getHotelId(req);
  const option = await SetupOption.findOneAndUpdate(
    { _id: req.params.id, hotelId },
    { isActive: false },
    { new: true }
  );

  if (!option) {
    return res.status(404).json({
      success: false,
      message: "Setup option not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "Setup option deactivated",
    data: option,
  });
});

module.exports = {
  getSetupOptions,
  createSetupOption,
  updateSetupOption,
  deactivateSetupOption,
};
