const Service = require('../../../../models/Admin/serviceModel');

const getServices = async (req, res) => {
  try {
    const services = await Service.find({ hotelId: req.user.hotelId });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch services", error: error.message });
  }
};

const createService = async (req, res) => {
  try {
    const {
      name,
      code,
      category,
      description,
      defaultPrice,
      chargeType,
      gstApplicable,
      gstPercentage,
      isFood,
    } = req.body;

    if (!name || !code || defaultPrice == null) {
      return res.status(400).json({ message: "Name, code and defaultPrice are required" });
    }

    const existing = await Service.findOne({ code, hotelId: req.user.hotelId });
    if (existing) {
      return res.status(400).json({ message: "Service code already exists" });
    }

    const service = await Service.create({
      name,
      code,
      category: category || "Other",
      description: description || "",
      defaultPrice,
      chargeType: chargeType || "PER_STAY",
      gstApplicable: typeof gstApplicable !== "undefined" ? !!gstApplicable : Number(gstPercentage || 0) > 0,
      gstPercentage: Number(gstPercentage || 0),
      isFood: !!isFood,
      hotelId: req.user.hotelId,
    });

    res.status(201).json({ message: "Service created", service });
  } catch (error) {
    res.status(500).json({ message: "Failed to create service", error: error.message });
  }
};

const updateService = async (req, res) => {
  try {
    const updates = {
      ...req.body,
      gstApplicable:
        typeof req.body.gstApplicable !== "undefined"
          ? !!req.body.gstApplicable
          : req.body.gstApplicable,
      gstPercentage:
        typeof req.body.gstPercentage !== "undefined"
          ? Number(req.body.gstPercentage)
          : undefined,
    };

    const updated = await Service.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update service", error: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const updated = await Service.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ message: "Service deactivated", service: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to deactivate service", error: error.message });
  }
};

module.exports = {
  getServices,
  createService,
  updateService,
  deleteService,
};
