const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  getTravelAgents,
  createTravelAgent,
  updateTravelAgent,
  deleteTravelAgent,
} = require("../controllers/travelAgentController");

router.use(protect, authorizeRoles("hoteladmin", "staff"));

router.get("/", getTravelAgents);
router.post("/", authorizeRoles("hoteladmin"), createTravelAgent);
router.put("/:id", authorizeRoles("hoteladmin"), updateTravelAgent);
router.delete("/:id", authorizeRoles("hoteladmin"), deleteTravelAgent);

module.exports = router;