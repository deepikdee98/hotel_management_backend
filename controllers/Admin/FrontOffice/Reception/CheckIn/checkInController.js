const mongoose = require("mongoose");
const checkinFields = require('../../../../../interfaces/checkinFields');
const Checkin = require('../../../../../models/Admin/checkinModel');
const Folio = require('../../../../../models/Admin/folioModel');
const Room = require('../../../../../models/Admin/roomModel');
const Hotel = require('../../../../../models/SuperAdmin/hotelModel');
const generateBookingNumber = require('./generateBookingNumber');


// @desc    Get all guest check-in details
// @route   GET /api/admin/frontoffice/reception/check-in
// @access  Private (Hotel Admin)
const getAllCheckIns = async (req, res) => {
  try {

    const checkins = await Checkin.find({ hotelId: req.user.hotelId })
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
    
    // Also map idProofType and idProofNumber if they were sent with different names
    if (req.body.idProofType !== undefined) checkinData.idProofType = req.body.idProofType;
    if (req.body.idProofNumber !== undefined) checkinData.idProofNumber = req.body.idProofNumber;

    // Map field name variations
    if (req.body.remark !== undefined && !checkinData.remarks) checkinData.remarks = req.body.remark;
    if (req.body.ledgerAc !== undefined && !checkinData.ledgerAccount) checkinData.ledgerAccount = req.body.ledgerAc;
    if (req.body.checkoutPlan !== undefined && !checkinData.checkoutPlan) checkinData.checkoutPlan = req.body.checkoutPlan;
    if (req.body.gstIn !== undefined && !checkinData.gstNumber) checkinData.gstNumber = req.body.gstIn;
    
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

    const room = await Room.findOne({
      roomNumber: checkinData.roomNumber,
      hotelId: req.user.hotelId
    });

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status === "occupied" && checkinData.guestType !== "PAX") {
      throw new Error("Room already occupied");
    }

    checkinData.hotelId = room.hotelId;
    checkinData.roomNumber = room._id;
    checkinData.roomType = room.roomType;

    if (req.body.reservationId) {
      checkinData.reservationId = req.body.reservationId;
    }



    checkinData.bookingNo = await generateBookingNumber(room.hotelId);

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

    if (checkin.guestType !== "PAX") {
      await Folio.create({
        hotelId: checkin.hotelId,
        folioNumber: `FO-${String(checkin._id).slice(-8).toUpperCase()}`,
        checkinId: checkin._id,
        reservationId: checkin.reservationId || null,
        guestName: checkin.guestName,
        roomId: checkin.roomNumber || null,
      });
    }

    if (room.status !== "occupied") {
      await Room.findByIdAndUpdate(room._id, {
        status: "occupied"
      });
    }

    const result = await Checkin.findById(checkin._id)
      .populate({ path: "roomNumber", select: "roomNumber" })
      .populate({ path: "roomType", select: "code" })
      .populate({ path: "planType", select: "code" });

    res.status(201).json({
      success: true,
      message: "Guest checked-in successfully",
      data: {
        bookingNo: checkin.bookingNo,
        registerNo: checkin.registerNo,
        guestName: checkin.guestName,
        roomNumber: result.roomNumber?.roomNumber,
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

    const updated = await Checkin.findByIdAndUpdate(id, updateData, { new: true })
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

module.exports = {
  createCheckIn,
  getAllCheckIns,
  getCheckInById,
  expressCheckIn,
  addPaxCheckIn,
  getGRCardByRoom,
  updateCheckIn
};



