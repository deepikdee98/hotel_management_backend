const ServiceCode = require("../../../../models/Admin/ServiceCodeModel");


// @desc    Get Service Codes
// @route   GET /admin/setup/service-codes
// @access  Private (Hotel Admin)
const getServiceCodes = async (req, res) => {
  try {

    const serviceCodes = await ServiceCode.find({
      hotelId: req.user.hotelId
    });

    res.json(serviceCodes);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch service codes"
    });

  }
};



// @desc    Create Service Code
// @route   POST /admin/setup/service-codes
// @access  Private (Hotel Admin)
const createServiceCode = async (req, res) => {
  try {

    const { code, serviceName, category, defaultRate, gst } = req.body;

    if (!code || !serviceName || !category) {
      return res.status(400).json({
        message: "Code, service name and category are required"
      });
    }

    const existing = await ServiceCode.findOne({ code });

    if (existing) {
      return res.status(400).json({
        message: "Service code already exists"
      });
    }

    const serviceCode = await ServiceCode.create({
      code,
      serviceName,
      category,
      defaultRate,
      gst,
      hotelId: req.user.hotelId
    });

    res.status(201).json({
      message: "Service code created successfully",
      serviceCode
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to create service code"
    });

  }
};



// @desc    Update Service Code
// @route   PUT /admin/setup/service-codes/:id
// @access  Private (Hotel Admin)
const updateServiceCode = async (req, res) => {
  try {

    const updated = await ServiceCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Service code not found"
      });
    }

    res.json({
      message: "Service code updated",
      updated
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to update service code"
    });

  }
};



// @desc    Delete Service Code
// @route   DELETE /admin/setup/service-codes/:id
// @access  Private (Hotel Admin)
const deleteServiceCode = async (req, res) => {
  try {

    const serviceCode = await ServiceCode.findByIdAndDelete(req.params.id);

    if (!serviceCode) {
      return res.status(404).json({
        message: "Service code not found"
      });
    }

    res.json({
      message: "Service code deleted"
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to delete service code"
    });

  }
};



// @desc    Update Service Code Status
// @route   PATCH /admin/setup/service-codes/:id/status
// @access  Private (Hotel Admin)
const updateServiceCodeStatus = async (req, res) => {
  try {

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required"
      });
    }

    const serviceCode = await ServiceCode.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!serviceCode) {
      return res.status(404).json({
        message: "Service code not found"
      });
    }

    res.json({
      message: "Service code status updated",
      serviceCode
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to update service code status"
    });

  }
};


module.exports = {
  getServiceCodes,
  createServiceCode,
  updateServiceCode,
  deleteServiceCode,
  updateServiceCodeStatus
};