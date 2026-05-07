const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../../../../controllers/Admin/FrontOffice/SetUp/serviceController');
const { protect } = require("../../../../middleware/authMiddleware");
const { authorizeRoles } = require("../../../../middleware/roleMiddleware");

router.use(protect);
router.use(authorizeRoles("hoteladmin"));

router.route('/')
  .get(getServices)
  .post(createService);

router.route('/:id')
  .put(updateService)
  .delete(deleteService);

module.exports = router;
