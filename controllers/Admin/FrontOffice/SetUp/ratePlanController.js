const RatePlan = require("../../../../models/Admin/ratePlanModel");

const buildRatePlanPayload = (body) => {
  const foodIncluded = Boolean(body.foodIncluded);

  return {
    name: body.name,
    code: body.code,
    description: body.description || "",
    foodIncluded,
    mealType: foodIncluded ? String(body.mealType || "").trim() : "",
    foodCharge: foodIncluded ? Math.max(0, Number(body.foodCharge) || 0) : 0,
    status: body.status || "active",
  };
};


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

    const { name, code, foodIncluded, mealType, foodCharge, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message: "Name and code are required"
      });
    }

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    if (foodIncluded && (!mealType || Number(foodCharge) < 0)) {
      return res.status(400).json({
        message: "Meal type and valid food charge are required when food is included"
      });
    }

    const existing = await RatePlan.findOne({ code, hotelId: req.user.hotelId });

    if (existing) {
      return res.status(400).json({
        message: "Rate plan code already exists"
      });
    }

    const ratePlan = await RatePlan.create({
      ...buildRatePlanPayload(req.body),
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
    const { status, foodIncluded, mealType, foodCharge } = req.body;

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    if (foodIncluded && (!mealType || Number(foodCharge) < 0)) {
      return res.status(400).json({
        message: "Meal type and valid food charge are required when food is included"
      });
    }

    const updated = await RatePlan.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      buildRatePlanPayload(req.body),
      { returnDocument: "after" }
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

    const ratePlan = await RatePlan.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });

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

    const ratePlan = await RatePlan.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      { status },
      { returnDocument: "after" }
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
