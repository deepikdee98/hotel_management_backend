const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} = require("../controllers/companyController");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.get("/", getCompanies);
router.post("/", authorizeRoles("hoteladmin"), createCompany);
router.put("/:id", authorizeRoles("hoteladmin"), updateCompany);
router.delete("/:id", authorizeRoles("hoteladmin"), deleteCompany);

module.exports = router;