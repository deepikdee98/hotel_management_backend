const express = require("express");
const router = express.Router();

const {
  addService,
  getServices,
  deleteService,
  updateService
} = require("../../../../../controllers/Admin/FrontOffice/Reception/PostService/postServiceController");

const { protect } = require("../../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.post("/", addService);
router.get("/", getServices);
router.delete("/:id", deleteService);
router.put("/:id", updateService);

module.exports = router;