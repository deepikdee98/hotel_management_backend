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

    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedCode = typeof code === "string" ? code.trim().toUpperCase() : "";

    if (!normalizedName) {
      return res.status(400).json({ message: "Service name is required" });
    }

    const existing = normalizedCode
      ? await Service.findOne({ code: normalizedCode, hotelId: req.user.hotelId })
      : null;
    if (existing) {
      return res.status(400).json({ message: "Service code already exists" });
    }

    const service = await Service.create({
      name: normalizedName,
      ...(normalizedCode ? { code: normalizedCode } : {}),
      category: category || "Other",
      description: description || "",
      defaultPrice: Number(defaultPrice || 0),
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

    const updated = await Service.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      updates,
      { returnDocument: "after" }
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
    const updated = await Service.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      { status: "inactive" },
      { returnDocument: "after" }
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
