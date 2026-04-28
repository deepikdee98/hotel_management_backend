const express = require("express");

const { runNightAuditManually, getNightAuditRunStatus } = require("../controllers/nightAuditController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { validateNightAuditRun } = require("../middleware/nightAuditValidationMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("superadmin", "hoteladmin"));

router.get("/status", getNightAuditRunStatus);
router.post("/run", validateNightAuditRun, runNightAuditManually);

module.exports = router;