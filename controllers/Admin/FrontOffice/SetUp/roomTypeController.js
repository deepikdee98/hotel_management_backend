const RoomType = require('../../../../models/Admin/roomTypeModel');


// @desc    Get Room Types
// @route   GET /admin/setup/room-types
// @access  Private (Hotel Admin)
const getRoomTypes = async (req, res) => {

  try {

    const roomTypes = await RoomType.find({
      hotelId: req.user.hotelId
    });

    res.json(roomTypes);

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch room types"
    });
  }
};



// @desc    Create Room Type
// @route   POST /admin/setup/room-types
// @access  Private (Hotel Admin)
const createRoomType = async (req, res) => {
  try {
    const { name, code, baseRate, maxOccupancy, status, gstPercentage, gstType } = req.body;

    if (!name || !code || baseRate == null || maxOccupancy == null) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    const existing = await RoomType.findOne({
      code,
      hotelId: req.user.hotelId
    });

    if (existing) {
      return res.status(400).json({
        message: "Room code already exists for this hotel"
      });
    }

    // GST Calculation logic
    const percentage = Number(gstPercentage) || 0;
    const type = gstType || "EXCLUSIVE";
    let calculatedBaseRate = Number(baseRate);

    if (percentage > 0 && type === "INCLUSIVE") {
      calculatedBaseRate = (calculatedBaseRate * 100) / (100 + percentage);
    }

    const roomType = await RoomType.create({
      name,
      code,
      baseRate: calculatedBaseRate,
      maxOccupancy,
      gstPercentage: percentage,
      gstType: type,
      status: status || "active",
      hotelId: req.user.hotelId 
    });

    res.status(201).json({
      message: "Room type created",
      roomType
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to create room type",
      error: error.message
    });
  }
};



// @desc    Update Room Type
// @route   PUT /admin/setup/room-types/:id
// @access  Private (Hotel Admin)
const updateRoomType = async (req, res) => {

  try {
    const { status, baseRate, gstPercentage, gstType } = req.body;

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    const existingRoomType = await RoomType.findById(req.params.id);
    if (!existingRoomType) {
      return res.status(404).json({
        message: "Room type not found"
      });
    }

    // Logic to recalculate baseRate if relevant fields are updated
    let updateData = { ...req.body };
    
    // Check if we need to recalculate baseRate
    // We only recalculate if baseRate is provided in the body
    // If only gstPercentage or gstType is provided without baseRate, 
    // it's ambiguous if we should use the stored baseRate (which is already calculated).
    // Usually, updating GST config implies the baseRate should be recalculated from the "raw" price.
    // However, since we overwrite baseRate, we don't have the "raw" price anymore.
    // The requirement says "Add new fields as optional (with defaults)" and "Refactor only where required".
    
    if (baseRate != null) {
      const percentage = gstPercentage != null ? Number(gstPercentage) : existingRoomType.gstPercentage;
      const type = gstType || existingRoomType.gstType;
      let calculatedBaseRate = Number(baseRate);

      if (percentage > 0 && type === "INCLUSIVE") {
        calculatedBaseRate = (calculatedBaseRate * 100) / (100 + percentage);
      }
      updateData.baseRate = calculatedBaseRate;
    }

    const updated = await RoomType.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);

  } catch (error) {

    res.status(500).json({
      message: "Failed to update room type"
    });

  }
};



// @desc    Delete Room Type
// @route   DELETE /admin/setup/room-types/:id
// @access  Private (Hotel Admin)
const deleteRoomType = async (req, res) => {

  try {

    const roomType = await RoomType.findByIdAndDelete(req.params.id);

    if (!roomType) {
      return res.status(404).json({
        message: "Room type not found"
      });
    }

    res.json({
      message: "Room type deleted"
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to delete room type"
    });

  }
};



// @desc    Activate / Deactivate Room Type
// @route   PATCH /admin/setup/room-types/:id/status
// @access  Private (Hotel Admin)
const updateRoomTypeStatus = async (req, res) => {

  try {

    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required"
      });
    }

    const roomType = await RoomType.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!roomType) {
      return res.status(404).json({
        message: "Room type not found"
      });
    }

    res.json({
      message: "Room type status updated",
      roomType
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to update status"
    });

  }
};



module.exports = {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  updateRoomTypeStatus
};