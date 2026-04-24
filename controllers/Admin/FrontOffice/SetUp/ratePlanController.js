const RatePlan = require("../../../../models/Admin/ratePlanModel");


// @desc    Get Rate Plans
// @route   GET /admin/setup/rate-plans
// @access  Private (Hotel Admin)
const getRatePlans = async (req, res) => {
  try {

    const ratePlans = await RatePlan.find({
      hotelId: req.user.hotelId
    });

    res.json(ratePlans);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch rate plans"
    });

  }
};

// @desc    Create Rate Plan
// @route   POST /admin/setup/rate-plans
// @access  Private (Hotel Admin)
const createRatePlan = async (req, res) => {
  try {

    const { name, code, description, status } = req.body;

    if (!name || !code || !description) {
      return res.status(400).json({
        message: "Name, code, description and amount are required"
      });
    }

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    const existing = await RatePlan.findOne({ code, hotelId: req.user.hotelId });

    if (existing) {
      return res.status(400).json({
        message: "Rate plan code already exists"
      });
    }

    const ratePlan = await RatePlan.create({
      name,
      code,
      description,
      status: status || "active",
      hotelId: req.user.hotelId
    });

    res.status(201).json({
      message: "Rate plan created successfully",
      ratePlan
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to create rate plan"
    });

  }
};



// @desc    Update Rate Plan
// @route   PUT /admin/setup/rate-plans/:id
// @access  Private (Hotel Admin)
const updateRatePlan = async (req, res) => {
  try {
    const { status } = req.body;

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    const updated = await RatePlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Rate plan not found"
      });
    }

    res.json(updated);

  } catch (error) {

    res.status(500).json({
      message: "Failed to update rate plan"
    });

  }
};



// @desc    Delete Rate Plan
// @route   DELETE /admin/setup/rate-plans/:id
// @access  Private (Hotel Admin)
const deleteRatePlan = async (req, res) => {
  try {

    const ratePlan = await RatePlan.findByIdAndDelete(req.params.id);

    if (!ratePlan) {
      return res.status(404).json({
        message: "Rate plan not found"
      });
    }

    res.json({
      message: "Rate plan deleted"
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to delete rate plan"
    });

  }
};



// @desc    Update Rate Plan Status
// @route   PATCH /admin/setup/rate-plans/:id/status
// @access  Private (Hotel Admin)
const updateRatePlanStatus = async (req, res) => {
  try {

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required"
      });
    }

    const ratePlan = await RatePlan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!ratePlan) {
      return res.status(404).json({
        message: "Rate plan not found"
      });
    }

    res.json({
      message: "Rate plan status updated",
      ratePlan
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to update rate plan status"
    });

  }
};


module.exports = {
  getRatePlans,
  createRatePlan,
  updateRatePlan,
  deleteRatePlan,
  updateRatePlanStatus
};