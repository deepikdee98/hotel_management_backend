const asyncHandler = require("express-async-handler");

const { createS3ReadTarget, createS3UploadTarget } = require("../services/s3UploadService");

const createUploadUrl = asyncHandler(async (req, res) => {
  const {
    fileName,
    contentType,
    uploadType,
    fileSize,
    storageScope,
    customerName,
  } = req.body || {};

  if (!fileName || !contentType) {
    res.status(400);
    throw new Error("fileName and contentType are required");
  }

  const target = createS3UploadTarget({
    hotelId: req.user.hotelId,
    hotelName: req.user.hotelName,
    userId: req.user._id,
    fileName,
    contentType,
    uploadType,
    fileSize,
    storageScope,
    customerName,
  });

  res.json({ success: true, data: target });
});

const createReadUrl = asyncHandler(async (req, res) => {
  const { key } = req.body || {};

  if (!key) {
    res.status(400);
    throw new Error("key is required");
  }

  const target = createS3ReadTarget({
    hotelId: req.user.hotelId,
    hotelName: req.user.hotelName,
    key,
  });

  res.json({ success: true, data: target });
});

module.exports = {
  createUploadUrl,
  createReadUrl,
};
