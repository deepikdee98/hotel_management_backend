const express = require("express");

const { createReadUrl, createUploadUrl } = require("../controllers/uploadController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { validateS3UploadRequest } = require("../middleware/fileUploadValidation");

const router = express.Router();

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"));

router.post("/presign", validateS3UploadRequest, createUploadUrl);
router.post("/read-url", createReadUrl);

module.exports = router;
