const Service = require("../../../../models/Admin/serviceModel");

const mapServiceToLegacy = (service) => ({
  ...service.toObject(),
  serviceName: service.name,
  defaultRate: service.defaultPrice,
  gst: service.gstPercentage,
});

const getServiceCodes = async (req, res) => {
  try {
    const services = await Service.find({ hotelId: req.user.hotelId });
    const mapped = services.map(mapServiceToLegacy);
    res.json(mapped);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch service codes",
      error: error.message,
    });
  }
};

const createServiceCode = async (req, res) => {
  try {
    const { code, serviceName, category, defaultRate, gst } = req.body;

    if (!code || !serviceName || !category) {
      return res.status(400).json({
        message: "Code, service name and category are required",
      });
    }

    const existing = await Service.findOne({ code, hotelId: req.user.hotelId });
    if (existing) {
      return res.status(400).json({
        message: "Service code already exists",
      });
    }

    const service = await Service.create({
      name: serviceName,
      code,
      category,
      defaultPrice: Number(defaultRate || 0),
      gstApplicable: Number(gst || 0) > 0,
      gstPercentage: Number(gst || 0),
      gstType: "EXCLUSIVE",
      hotelId: req.user.hotelId,
    });

    res.status(201).json({
      message: "Service code created successfully",
      serviceCode: mapServiceToLegacy(service),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create service code",
      error: error.message,
    });
  }
};

const updateServiceCode = async (req, res) => {
  try {
    const updates = {
      ...req.body,
      name: req.body.serviceName || req.body.name,
      defaultPrice:
        typeof req.body.defaultRate !== "undefined"
          ? Number(req.body.defaultRate)
          : undefined,
      gstPercentage:
        typeof req.body.gst !== "undefined"
          ? Number(req.body.gst)
          : undefined,
    };

    const updated = await Service.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Service code not found",
      });
    }

    res.json({
      message: "Service code updated",
      updated: mapServiceToLegacy(updated),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update service code",
      error: error.message,
    });
  }
};

const deleteServiceCode = async (req, res) => {
  try {
    const service = await Service.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      { status: "inactive" },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        message: "Service code not found",
      });
    }

    res.json({
      message: "Service code deactivated",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete service code",
      error: error.message,
    });
  }
};

const updateServiceCodeStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    const service = await Service.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      { status },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({
        message: "Service code not found",
      });
    }

    res.json({
      message: "Service code status updated",
      serviceCode: mapServiceToLegacy(service),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update service code status",
      error: error.message,
    });
  }
};

module.exports = {
  getServiceCodes,
  createServiceCode,
  updateServiceCode,
  deleteServiceCode,
  updateServiceCodeStatus,
};
