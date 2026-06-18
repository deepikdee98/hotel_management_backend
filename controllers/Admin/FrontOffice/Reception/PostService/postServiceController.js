const ServiceTransaction = require("../../../../../models/Admin/serviceTransactionModel");
const Folio = require("../../../../../models/Admin/folioModel");
const Checkin = require("../../../../../models/Admin/checkinModel");
const { postServiceCharge } = require("../../../../../services/frontOfficeAccountingService");

// @desc    Add a new service
// @route   POST /api/admin/frontoffice/reception/post-service
// @access  Private (Hotel Admin)
const addService = async (req, res) => {
  try {
    const { serviceName, serviceId, serviceCodeId, roomId, qty, amount, total, remark, gstInclusive } = req.body;

    if (!serviceName || !roomId || !qty || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const finalTotal = total || qty * amount;
    const serviceRef = serviceId || serviceCodeId;

    const data = await ServiceTransaction.create({
      hotelId: req.user.hotelId,
      service: serviceRef,
      serviceName,
      room: roomId,
      qty,
      amount,
      total: finalTotal,
      remark,
      gstInclusive,
    });

    const checkin = await Checkin.findOne({ hotelId: req.user.hotelId, roomNumber: roomId, status: { $ne: "checked-out" } });
    const folio = checkin ? await Folio.findOne({ hotelId: req.user.hotelId, checkinId: checkin._id }) : null;

    await postServiceCharge({
      hotelId: req.user.hotelId,
      businessId: req.user.businessId || "",
      sourceId: data._id,
      folioId: folio?._id || null,
      checkinId: checkin?._id || null,
      amount: finalTotal,
      description: serviceName,
      reference: data._id,
      userId: req.user._id,
    });

    res.status(201).json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get Services with room details
// @route GET /api/admin/frontoffice/reception/post-service
// @access Private (Hotel Admin)
const getServices = async (req, res) => {
  try {
    const data = await ServiceTransaction.find({ hotelId: req.user.hotelId })
      .populate("room", "roomNumber")
      .populate("service", "name code category gstPercentage gstType defaultPrice")
      .sort({ createdAt: -1 });

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete Service by ID
// @route DELETE /api/admin/frontoffice/reception/post-service/:id
// @access Private (Hotel Admin)

const deleteService = async (req, res) => {
  try {
    await ServiceTransaction.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });
    res.json({ success: true, message: "Deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update Service by ID
// @route   PUT /api/admin/frontoffice/reception/post-service/:id
// @access  Private (Hotel Admin)
const updateService = async (req, res) => {
  try {
    const { serviceName, serviceId, serviceCodeId, roomId, qty, amount, total, remark, gstInclusive } = req.body;

    const finalTotal = total || qty * amount;
    const serviceRef = serviceId || serviceCodeId;

    const data = await ServiceTransaction.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      {
        service: serviceRef,
        serviceName,
        room: roomId,
        qty,
        amount,
        total: finalTotal,
        remark,
        gstInclusive,
      },
      { returnDocument: "after" }
    );

    if (!data) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  addService,
  getServices,
  deleteService,
  updateService
};
