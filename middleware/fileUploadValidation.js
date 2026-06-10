const { validateFile } = require("../services/s3UploadService");

const validateS3UploadRequest = (req, res, next) => {
  const { fileName, contentType, fileSize } = req.body || {};

  if (!fileName || !contentType) {
    return res.status(400).json({
      success: false,
      message: "fileName and contentType are required",
    });
  }

  try {
    validateFile({ contentType, fileSize });
    return next();
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  validateS3UploadRequest,
};
