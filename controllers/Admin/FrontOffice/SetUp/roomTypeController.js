const RoomType = require('../../../../models/Admin/roomTypeModel');

const calculateTaxExclusiveRate = (rate, gstPercentage, gstType) => {
  const value = Number(rate || 0);
  const percentage = Number(gstPercentage) || 0;

  if (percentage > 0 && gstType === "INCLUSIVE") {
    return (value * 100) / (100 + percentage);
  }

  return value;
};

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
    const { name, code, baseRate, nonAcRate, acRate, extraBedNonAcRate, extraBedAcRate, maxOccupancy, status, gstPercentage, gstType } = req.body;

    const rawNonAcRate = nonAcRate != null ? Number(nonAcRate) : baseRate != null ? Number(baseRate) : 0;
    const rawAcRate = acRate != null ? Number(acRate) : 0;
    const rawExtraBedNonAc = extraBedNonAcRate != null ? Number(extraBedNonAcRate) : 0;
    const rawExtraBedAc = extraBedAcRate != null ? Number(extraBedAcRate) : 0;

    if (!name || !code || maxOccupancy == null) {
      return res.status(400).json({
        message: "Name, code and max occupancy are required"
      });
    }

    if (rawNonAcRate <= 0 && rawAcRate <= 0) {
      return res.status(400).json({
        message: "Enter at least one rate: Non AC or AC"
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

    const percentage = Number(gstPercentage) || 0;
    const type = gstType || "EXCLUSIVE";
    const calculatedNonAcRate = calculateTaxExclusiveRate(rawNonAcRate, percentage, type);
    const calculatedAcRate = calculateTaxExclusiveRate(rawAcRate, percentage, type);
    const calculatedExtraBedNonAc = calculateTaxExclusiveRate(rawExtraBedNonAc, percentage, type);
    const calculatedExtraBedAc = calculateTaxExclusiveRate(rawExtraBedAc, percentage, type);
    const calculatedBaseRate = calculatedNonAcRate > 0 ? calculatedNonAcRate : calculatedAcRate;

    const roomType = await RoomType.create({
      name,
      code,
      baseRate: calculatedBaseRate,
      nonAcRate: calculatedNonAcRate,
      acRate: calculatedAcRate,
      extraBedNonAcRate: calculatedExtraBedNonAc,
      extraBedAcRate: calculatedExtraBedAc,
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
    const { status, baseRate, nonAcRate, acRate, extraBedNonAcRate, extraBedAcRate, gstPercentage, gstType } = req.body;

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value"
      });
    }

    const existingRoomType = await RoomType.findOne({ _id: req.params.id, hotelId: req.user.hotelId });
    if (!existingRoomType) {
      return res.status(404).json({
        message: "Room type not found"
      });
    }

    let updateData = { ...req.body };
    const percentage = gstPercentage != null ? Number(gstPercentage) : existingRoomType.gstPercentage;
    const type = gstType || existingRoomType.gstType;
    const nextNonAcRate = nonAcRate != null || baseRate != null
      ? Number(nonAcRate != null ? nonAcRate : baseRate)
      : Number(existingRoomType.nonAcRate || 0);
    const nextAcRate = acRate != null ? Number(acRate) : Number(existingRoomType.acRate || 0);

    const nextExtraBedNonAcRate = extraBedNonAcRate != null
      ? Number(extraBedNonAcRate)
      : Number(existingRoomType.extraBedNonAcRate || 0);
    const nextExtraBedAcRate = extraBedAcRate != null
      ? Number(extraBedAcRate)
      : Number(existingRoomType.extraBedAcRate || 0);

    if (nextNonAcRate <= 0 && nextAcRate <= 0) {
      return res.status(400).json({
        message: "Enter at least one rate: Non AC or AC"
      });
    }

    if (nonAcRate != null || baseRate != null) {
      updateData.nonAcRate = calculateTaxExclusiveRate(nextNonAcRate, percentage, type);
    }

    if (acRate != null) {
      updateData.acRate = calculateTaxExclusiveRate(nextAcRate, percentage, type);
    }

    if (extraBedNonAcRate != null) {
      updateData.extraBedNonAcRate = calculateTaxExclusiveRate(nextExtraBedNonAcRate, percentage, type);
    }

    if (extraBedAcRate != null) {
      updateData.extraBedAcRate = calculateTaxExclusiveRate(nextExtraBedAcRate, percentage, type);
    }

    const calculatedNextNonAcRate = updateData.nonAcRate != null ? updateData.nonAcRate : Number(existingRoomType.nonAcRate || 0);
    const calculatedNextAcRate = updateData.acRate != null ? updateData.acRate : Number(existingRoomType.acRate || 0);
    updateData.baseRate = calculatedNextNonAcRate > 0 ? calculatedNextNonAcRate : calculatedNextAcRate;

    const updated = await RoomType.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      updateData,
      { returnDocument: "after" }
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

    const roomType = await RoomType.findOneAndDelete({ _id: req.params.id, hotelId: req.user.hotelId });

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

    const roomType = await RoomType.findOneAndUpdate({ _id: req.params.id, hotelId: req.user.hotelId },
      { status },
      { returnDocument: "after" }
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
