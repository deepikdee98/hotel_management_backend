const express = require('express');
const router = express.Router();
const {createRoomAdvance,getAllRoomAdvances,getRoomAdvanceById} = require("../../../../../controllers/Admin/FrontOffice/Reception/RoomAdvance/roomAdvanceController")
const { protect } = require("../../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../../middleware/roleMiddleware");

router.use(protect, authorizeRoles("hoteladmin", "staff"));


router.post('/', createRoomAdvance);
router.get('/', getAllRoomAdvances);
router.get('/:id', getRoomAdvanceById);

module.exports = router;