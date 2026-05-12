const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../../../../controllers/Admin/FrontOffice/SetUp/serviceController');
const { protect } = require("../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../middleware/roleMiddleware");

router.use(protect);

router.route('/')
  .get(authorizeRoles("hoteladmin", "staff"), getServices)
  .post(authorizeRoles("hoteladmin"), createService);

router.route('/:id')
  .put(authorizeRoles("hoteladmin"), updateService)
  .delete(authorizeRoles("hoteladmin"), deleteService);

module.exports = router;
