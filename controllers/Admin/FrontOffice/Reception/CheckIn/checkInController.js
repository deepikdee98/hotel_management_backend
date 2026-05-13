const mongoose = require("mongoose");
const checkinFields = require('../../../../../interfaces/checkinFields');
const Checkin = require('../../../../../models/Admin/checkinModel');
const Folio = require('../../../../../models/Admin/folioModel');
const Room = require('../../../../../models/Admin/roomModel');
const Hotel = require('../../../../../models/SuperAdmin/hotelModel');
const Reservation = require('../../../../../models/Admin/reservationModel');
const generateBookingNumber = require('./generateBookingNumber');

const generateBookingGroupId = async (hotelId) => {
  const prefix = `GRP-${new Date().getFullYear()}`;
  const lastGroup = await Checkin.findOne({
    hotelId,
    bookingGroupId: { $regex: `^${prefix}-` },
  }).sort({ createdAt: -1 }).select("bookingGroupId").lean();

  const lastSeq = Number(String(lastGroup?.bookingGroupId || "").split("-").pop()) || 0;
  return `${prefix}-${String(lastSeq + 1).padStart(4, "0")}`;
};

const getLinkedRoomsForGroup = async (hotelId, bookingGroupId) => {
  if (!bookingGroupId) return [];

  const linked = await Checkin.find({
    hotelId,
    bookingGroupId,
    status: { $ne: "checked-out" },
    guestType: { $ne: "PAX" },
  })
    .populate({ path: "roomNumber", select: "roomNumber" })
    .select("bookingNumber bookingNo roomNumber")
    .sort({ createdAt: 1 })
    .lean();

  return linked.map((item) => ({
    checkinId: item._id,
    bookingId: item.bookingNumber || item.bookingNo,
    roomNumber: item.roomNumber?.roomNumber || "",
  }));
};


// @desc    Get all guest check-in details
// @route   GET /api/admin/frontoffice/reception/check-in
// @access  Private (Hotel Admin)
const getAllCheckIns = async (req, res) => {
  try {
    const filter = { hotelId: req.user.hotelId };
    
    if (req.query.status) {
      if (req.query.status === "checked-in") {
        filter.status = { $ne: "checked-out" };
      } else {
        filter.status = req.query.status;
      }
    }

    const checkins = await Checkin.find(filter)
      .populate({
        path: "roomNumber",
        select: "roomNumber roomType",
        populate: {
          path: "roomType",
          select: "name code"
        }
      })
      .populate({
        path: "roomType",
        select: "name code"
      })
      .populate({
        path: "planType",
        select: "name code"
      })
      .sort({ createdAt: -1 });

    const formattedCheckins = checkins.map((checkin) => {
      // Robust room type selection: checkin.roomType -> roomNumber.roomType
      const roomTypeObj = checkin.roomType || checkin.roomNumber?.roomType;
      const roomTypeName = roomTypeObj?.name || roomTypeObj?.code || "";

      return {
        ...checkin.toObject(),
        roomId: checkin.roomNumber?._id,
        roomNumber: checkin.roomNumber?.roomNumber,
        roomType: roomTypeName,
        planType: checkin.planType?.name || checkin.planType?.code || ""
      };
    });

    res.status(200).json({
      success: true,
      count: formattedCheckins.length,
      data: formattedCheckins
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch check-ins"
    });
  }
};

// @desc    Get guest check-in details by ID
// @route   GET /api/admin/frontoffice/reception/check-in/:id
// @access  Private (Hotel Admin)
const getCheckInById = async (req, res) => {
  try {

    const { id } = req.params;

    const checkin = await Checkin.findOne({ _id: id, hotelId: req.user.hotelId })
      .populate({
        path: "roomNumber",
        select: "roomNumber"
      })
      .populate({
        path: "roomType",
        select: "code"
      })
      .populate({
        path: "planType",
        select: "code"
      });

    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "Check-in not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...checkin.toObject(),
        bookingGroupId: checkin.bookingGroupId || "",
        linkedRooms: await getLinkedRoomsForGroup(req.user.hotelId, checkin.bookingGroupId),
        roomNumber: checkin.roomNumber?.roomNumber,
        roomType: checkin.roomType?.code,
        planType: checkin.planType?.code
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch check-in details"
    });
  }
};

// @desc    Create new guest check-in
// @route   POST /api/admin/frontoffice/reception/check-in
// @access  Private (Hotel Admin)

const createCheckIn = async (req, res) => {
  try {
    const isExpress = req.body.isExpress;

    const checkinData = {};

    checkinFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        checkinData[field] = req.body[field];
      }
    });

    // Map frontend pax fields to model fields if they exist
    if (req.body.paxAdultMale !== undefined) checkinData.adultMale = req.body.paxAdultMale;
    if (req.body.paxAdultFemale !== undefined) checkinData.adultFemale = req.body.paxAdultFemale;
    if (req.body.paxChildren !== undefined) checkinData.children = req.body.paxChildren;
    
    // Auto calculate totalPax if not provided or to ensure accuracy
    const m = Number(checkinData.adultMale || 0);
    const f = Number(checkinData.adultFemale || 0);
    const c = Number(checkinData.children || 0);
    checkinData.totalPax = req.body.totalPax ? Number(req.body.totalPax) : (m + f + c);

    // Also map idProofType and idProofNumber if they were sent with different names
    if (req.body.idProofType !== undefined) checkinData.idProofType = req.body.idProofType;
    if (req.body.idProofNumber !== undefined) checkinData.idProofNumber = req.body.idProofNumber;

    // Map field name variations
    if (req.body.mobile !== undefined && !checkinData.mobileNo) checkinData.mobileNo = req.body.mobile;
    if (req.body.planCharge !== undefined && !checkinData.planCharges) checkinData.planCharges = req.body.planCharge;
    if (req.body.foodCharge !== undefined && !checkinData.foodCharges) checkinData.foodCharges = req.body.foodCharge;
    if (req.body.remark !== undefined && !checkinData.remarks) checkinData.remarks = req.body.remark;
    if (req.body.ledgerAc !== undefined && !checkinData.ledgerAccount) checkinData.ledgerAccount = req.body.ledgerAc;
    if (req.body.checkoutPlan !== undefined && !checkinData.checkoutPlan) checkinData.checkoutPlan = req.body.checkoutPlan;
    if (req.body.gstIn !== undefined && !checkinData.gstNumber) checkinData.gstNumber = req.body.gstIn;
    
    // Resolve roomType and planType if they are passed as codes/names instead of ObjectIds
    if (checkinData.roomType && !mongoose.Types.ObjectId.isValid(checkinData.roomType)) {
      const rt = await mongoose.model("RoomType").findOne({
        hotelId: req.user.hotelId,
        $or: [{ code: checkinData.roomType }, { name: checkinData.roomType }]
      });
      if (rt) checkinData.roomType = rt._id;
    }

    if (checkinData.planType && !mongoose.Types.ObjectId.isValid(checkinData.planType)) {
      const rp = await mongoose.model("RatePlan").findOne({
        hotelId: req.user.hotelId,
        $or: [{ code: checkinData.planType }, { name: checkinData.planType }]
      });
      if (rp) checkinData.planType = rp._id;
    }

    // Resolve roomNumber if it's passed as a number/string
    if (checkinData.roomNumber && (typeof checkinData.roomNumber !== 'string' || checkinData.roomNumber.length < 24)) {
      const room = await mongoose.model("Room").findOne({
        hotelId: req.user.hotelId,
        roomNumber: checkinData.roomNumber
      });
      if (room) {
        checkinData.roomNumber = room._id;
        if (!checkinData.roomType) {
          checkinData.roomType = room.roomType;
        }
      }
    } else if (checkinData.roomNumber && !mongoose.Types.ObjectId.isValid(checkinData.roomNumber)) {
        const room = await mongoose.model("Room").findOne({
            hotelId: req.user.hotelId,
            roomNumber: checkinData.roomNumber
          });
          if (room) {
            checkinData.roomNumber = room._id;
            if (!checkinData.roomType) {
              checkinData.roomType = room.roomType;
            }
          }
    }

    // Ensure DOB is properly formatted if it's a string
    if (checkinData.dob && typeof checkinData.dob === 'string') {
      checkinData.dob = new Date(checkinData.dob);
    }

    checkinData.guestType = checkinData.guestType || "Individual";
    checkinData.nights = checkinData.nights || 1;
    checkinData.checkInDate = checkinData.checkInDate || new Date();

    if (!checkinData.guestName && !checkinData.mobileNo) {
      throw new Error("Guest name or mobile is required");
    }

    if (!isExpress) {
      if (!checkinData.email) {
        throw new Error("Email is required for normal check-in");
      }
    }

    if (!checkinData.roomNumber || !mongoose.Types.ObjectId.isValid(checkinData.roomNumber)) {
        throw new Error("Room not found or invalid room number");
    }

    const room = await Room.findOne({ _id: checkinData.roomNumber, hotelId: req.user.hotelId });

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "available" && checkinData.guestType !== "PAX") {
      throw new Error(room.status === "occupied" ? "Room already occupied" : "Only available active rooms can be checked in");
    }

    const activeRoomCheckin = await Checkin.findOne({
      hotelId: room.hotelId,
      roomNumber: room._id,
      status: { $ne: "checked-out" },
      guestType: { $ne: "PAX" },
    });

    if (activeRoomCheckin && checkinData.guestType !== "PAX") {
      if (room.status !== "occupied") {
        await Room.findOneAndUpdate({ _id: room._id, hotelId: req.user.hotelId }, { status: "occupied" });
      }
      throw new Error(`Room ${room.roomNumber} is already checked in under booking ${activeRoomCheckin.bookingNumber || activeRoomCheckin.bookingNo || ""}`.trim());
    }

    checkinData.hotelId = room.hotelId;
    checkinData.roomNumber = room._id;
    checkinData.roomType = room.roomType;

    let reservation = null;
    if (req.body.reservationId) {
      reservation = await Reservation.findOne({
        hotelId: room.hotelId,
        $or: [
          mongoose.Types.ObjectId.isValid(req.body.reservationId) ? { _id: req.body.reservationId } : null,
          { reservationId: req.body.reservationId },
          { bookingNumber: req.body.reservationId },
        ].filter(Boolean),
      });

      if (reservation?._id) {
        checkinData.reservationId = reservation._id;
      } else if (mongoose.Types.ObjectId.isValid(req.body.reservationId)) {
        checkinData.reservationId = req.body.reservationId;
      }
    }

    let parentGuestCheckin = null;
    if (req.body.parentGuestCheckin) {
      parentGuestCheckin = await Checkin.findOne({
        _id: req.body.parentGuestCheckin,
        hotelId: room.hotelId,
        status: { $ne: "checked-out" },
        guestType: { $ne: "PAX" },
      });

      if (!parentGuestCheckin) {
        throw new Error("Parent guest check-in not found");
      }
    }

    checkinData.bookingGroupId = req.body.bookingGroupId
      || parentGuestCheckin?.bookingGroupId
      || await generateBookingGroupId(room.hotelId);
    checkinData.parentGuestCheckin = parentGuestCheckin?._id || null;

    const generatedBooking = reservation?.bookingNumber && !parentGuestCheckin && !req.body.bookingGroupId
      ? { bookingNumber: reservation.bookingNumber }
      : await generateBookingNumber(room.hotelId);

    checkinData.bookingNumber = generatedBooking.bookingNumber;
    checkinData.bookingNo = generatedBooking.bookingNumber;

    // Generate auto-increment registerNo: REG-YYYYMM-##### per hotel
    const now = new Date();
    const yearMonth = now.toISOString().slice(0, 7).replace(/-/g, ''); // YYYYMM
    const prefix = `REG-${yearMonth}`;

    // Find last registerNo with same prefix for this hotel
    const lastCheckin = await Checkin.findOne({
      hotelId: room.hotelId,
      registerNo: { $regex: `^${prefix}-` }
    }).sort({ createdAt: -1 });

    let nextSeq = 1;
    if (lastCheckin && lastCheckin.registerNo) {
      const seqMatch = lastCheckin.registerNo.match(/(\d+)$/);
      if (seqMatch) {
        nextSeq = parseInt(seqMatch[1]) + 1;
      }
    }

    checkinData.registerNo = `${prefix}-${nextSeq.toString().padStart(5, '0')}`;

    const checkin = await Checkin.create(checkinData);

    if (reservation) {
      reservation.bookingNumber = reservation.bookingNumber || checkin.bookingNumber;
      reservation.status = "checked-in";
      await reservation.save();
    }

    if (checkin.guestType !== "PAX") {
      const masterFolio = parentGuestCheckin
        ? await Folio.findOne({ hotelId: checkin.hotelId, checkinId: parentGuestCheckin._id }).select("_id")
        : null;

      await Folio.create({
        hotelId: checkin.hotelId,
        folioNumber: `FO-${String(checkin._id).slice(-8).toUpperCase()}`,
        checkinId: checkin._id,
        bookingGroupId: checkin.bookingGroupId || "",
        reservationId: checkin.reservationId || null,
        guestName: checkin.guestName,
        roomId: checkin.roomNumber || null,
        masterFolioId: masterFolio?._id || null,
      });
    }

    if (room.status !== "occupied") {
      await Room.findOneAndUpdate({ _id: room._id, hotelId: req.user.hotelId }, {
        status: "occupied"
      });
    }

    const result = await Checkin.findOne({ _id: checkin._id, hotelId: req.user.hotelId })
      .populate({ path: "roomNumber", select: "roomNumber" })
      .populate({ path: "roomType", select: "code" })
      .populate({ path: "planType", select: "code" });

    res.status(201).json({
      success: true,
      message: "Guest checked-in successfully",
      data: {
        bookingNo: checkin.bookingNo,
        bookingNumber: checkin.bookingNumber,
        registerNo: checkin.registerNo,
        checkinId: checkin._id,
        bookingGroupId: checkin.bookingGroupId,
        parentGuestCheckin: checkin.parentGuestCheckin,
        guestName: checkin.guestName,
        roomNumber: result.roomNumber?.roomNumber,
        linkedRooms: await getLinkedRoomsForGroup(checkin.hotelId, checkin.bookingGroupId),
      }
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create check-in"
    });
  }
};

// @desc    Express check-in
// @route   POST /front-office/check-in/express
// @access  Private
const expressCheckIn = async (req, res) => {
  req.body = {
    ...req.body,
    isExpress: true,
  };

  return createCheckIn(req, res);
};

// @desc    PAX check-in for existing check-in
// @route   POST /front-office/check-in/:checkInId/pax
// @access  Private
const addPaxCheckIn = async (req, res) => {
  try {
    console.log("PAX check-in called with ID:", req.params.checkInId);
    console.log("Hotel ID from user:", req.user.hotelId);
    
    const parentCheckin = await Checkin.findOne({
      _id: req.params.checkInId,
      hotelId: req.user.hotelId,
    });

    if (!parentCheckin) {
      console.log("Parent check-in not found for query:", { _id: req.params.checkInId, hotelId: req.user.hotelId });
      return res.status(404).json({
        success: false,
        message: "Check-in not found",
      });
    }

    const guests = Array.isArray(req.body.guests) ? req.body.guests : [];

    if (!guests.length) {
      return res.status(400).json({
        success: false,
        message: "guests array is required",
      });
    }

    const created = [];
    for (const guest of guests) {
      if (!guest.name) {
        continue;
      }

      const pax = await Checkin.create({
        hotelId: parentCheckin.hotelId,
        reservationId: parentCheckin.reservationId,
        bookingGroupId: parentCheckin.bookingGroupId,
        parentGuestCheckin: parentCheckin.parentGuestCheckin || parentCheckin._id,
        guestType: "PAX",
        guestName: guest.name,
        mobileNo: guest.phone,
        roomNumber: parentCheckin.roomNumber,
        roomType: parentCheckin.roomType,
        planType: parentCheckin.planType,
        relation: guest.relationship,
      });

      created.push(pax);
    }

    res.status(201).json({
      success: true,
      message: "PAX check-in added",
      data: created,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to add PAX check-in",
    });
  }
};

// @desc    Get GR Card details by Room ID
// @route   GET /api/admin/reception/check-in/gr-card/:roomId
// @access  Private (Hotel Admin)

const getGRCardByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const checkin = await Checkin.findOne({
      roomNumber: roomId,
      hotelId: req.user.hotelId,
      guestType: { $ne: "PAX" }
    })
      .populate({
        path: "roomNumber",
        select: "roomNumber roomType",
        populate: { path: "roomType", select: "name code" }
      })
      .populate({
        path: "roomType",
        select: "name code"  
      })
      .populate({
        path: "planType",
        select: "name code"
      })
      .sort({ createdAt: -1 });

    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "No active check-in found for this room"
      });
    }

    // Robust Room Type selection: try checkin.roomType first, then fallback to roomNumber.roomType
    const roomTypeObj = checkin.roomType || checkin.roomNumber?.roomType;
    const roomTypeName = roomTypeObj?.name || roomTypeObj?.code || "";

    // Fetch hotel details for dynamic GR card
    const hotel = await Hotel.findById(req.user.hotelId);

    res.status(200).json({
      success: true,
      data: {
        bookingNo: checkin.bookingNo,
        bookingNumber: checkin.bookingNumber || checkin.bookingNo,
        registerNo: checkin.registerNo || checkin.bookingNo || "", // Fallback to bookingNo for old records
        guestName: checkin.guestName,
        roomNumber: checkin.roomNumber?.roomNumber,
        roomType: roomTypeName,   
        planType: checkin.planType?.name || checkin.planType?.code || "",
        tariff: checkin.planCharges || 0,
        checkIn: checkin.checkInDate,
        checkOut: checkin.checkOutDate,
        noOfPax: (checkin.adultMale || 0) + (checkin.adultFemale || 0) + (checkin.children || 0) || 1,
        idProof: checkin.idProofNumber || "",
        nationality: checkin.nationality || "",
        address: checkin.address || "",
        email: checkin.email || "",
        mobileNo: checkin.mobileNo || "",
        company: checkin.company || "",
        dob: checkin.dob || "",
        arrivalFrom: checkin.arrivalFrom || "",
        departureTo: checkin.departureTo || "",
        purposeOfVisit: checkin.purposeOfVisit || "",
        adultMale: checkin.adultMale || 0,
        adultFemale: checkin.adultFemale || 0,
        children: checkin.children || 0,
        hotel: hotel ? {
          name: hotel.name,
          address: hotel.address,
          city: hotel.city,
          country: hotel.country,
          phone: hotel.phone
        } : null
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GR card data"
    });
  }
};

const updateCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const checkin = await Checkin.findOne({ _id: id, hotelId: req.user.hotelId });

    if (!checkin) {
      return res.status(404).json({
        success: false,
        message: "Check-in not found"
      });
    }

    const updateData = {};
    checkinFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Map field name variations
    if (req.body.mobile !== undefined && !updateData.mobileNo) updateData.mobileNo = req.body.mobile;
    if (req.body.planCharge !== undefined && !updateData.planCharges) updateData.planCharges = req.body.planCharge;
    if (req.body.foodCharge !== undefined && !updateData.foodCharges) updateData.foodCharges = req.body.foodCharge;
    if (req.body.remark !== undefined && !updateData.remarks) updateData.remarks = req.body.remark;
    if (req.body.ledgerAc !== undefined && !updateData.ledgerAccount) updateData.ledgerAccount = req.body.ledgerAc;
    if (req.body.checkoutPlan !== undefined && !updateData.checkoutPlan) updateData.checkoutPlan = req.body.checkoutPlan;
    if (req.body.gstIn !== undefined && !updateData.gstNumber) updateData.gstNumber = req.body.gstIn;

    // Resolve roomType and planType if they are passed as codes/names instead of ObjectIds
    if (updateData.roomType && !mongoose.Types.ObjectId.isValid(updateData.roomType)) {
      const rt = await mongoose.model("RoomType").findOne({
        hotelId: req.user.hotelId,
        $or: [{ code: updateData.roomType }, { name: updateData.roomType }]
      });
      if (rt) updateData.roomType = rt._id;
    }

    if (updateData.planType && !mongoose.Types.ObjectId.isValid(updateData.planType)) {
      const rp = await mongoose.model("RatePlan").findOne({
        hotelId: req.user.hotelId,
        $or: [{ code: updateData.planType }, { name: updateData.planType }]
      });
      if (rp) updateData.planType = rp._id;
    }

    // Resolve roomNumber if it's passed as a number/string
    if (updateData.roomNumber && (typeof updateData.roomNumber !== 'string' || updateData.roomNumber.length < 24)) {
      const room = await mongoose.model("Room").findOne({
        hotelId: req.user.hotelId,
        roomNumber: updateData.roomNumber
      });
      if (room) {
        updateData.roomNumber = room._id;
        // Also update roomType if it matches the new room
        if (!updateData.roomType) {
          updateData.roomType = room.roomType;
        }
      }
    } else if (updateData.roomNumber && !mongoose.Types.ObjectId.isValid(updateData.roomNumber)) {
        const room = await mongoose.model("Room").findOne({
            hotelId: req.user.hotelId,
            roomNumber: updateData.roomNumber
          });
          if (room) {
            updateData.roomNumber = room._id;
            if (!updateData.roomType) {
              updateData.roomType = room.roomType;
            }
          }
    }

    const updated = await Checkin.findOneAndUpdate({ _id: id, hotelId: req.user.hotelId }, updateData, { new: true })
      .populate({ path: "roomNumber", select: "roomNumber" })
      .populate({ path: "roomType", select: "code" })
      .populate({ path: "planType", select: "code" });

    res.status(200).json({
      success: true,
      message: "Check-in updated successfully",
      data: updated
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update check-in"
    });
  }
};

const removeLinkedRoomCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const checkin = await Checkin.findOne({
      _id: id,
      hotelId: req.user.hotelId,
      status: { $ne: "checked-out" },
      guestType: { $ne: "PAX" },
    });

    if (!checkin) {
      return res.status(404).json({ success: false, message: "Linked room check-in not found" });
    }

    if (!checkin.bookingGroupId || !checkin.parentGuestCheckin) {
      return res.status(400).json({ success: false, message: "Primary or single-room bookings cannot be removed here" });
    }

    await Folio.deleteMany({ hotelId: req.user.hotelId, checkinId: checkin._id });
    if (checkin.roomNumber) {
      await Room.findOneAndUpdate({ _id: checkin.roomNumber, hotelId: req.user.hotelId }, { status: "available" });
    }
    await Checkin.deleteOne({ _id: checkin._id, hotelId: req.user.hotelId });

    return res.json({
      success: true,
      message: "Linked room removed",
      data: {
        bookingGroupId: checkin.bookingGroupId,
        linkedRooms: await getLinkedRoomsForGroup(req.user.hotelId, checkin.bookingGroupId),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to remove linked room" });
  }
};

module.exports = {
  createCheckIn,
  getAllCheckIns,
  getCheckInById,
  expressCheckIn,
  addPaxCheckIn,
  getGRCardByRoom,
  updateCheckIn,
  removeLinkedRoomCheckIn
};
