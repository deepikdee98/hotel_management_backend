const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { authorizeModule } = require("../middleware/moduleMiddleware");

const Floor = require("../models/Admin/floorModel");
const RoomType = require("../models/Admin/roomTypeModel");
const RatePlan = require("../models/Admin/ratePlanModel");
const Room = require("../models/Admin/roomModel");
const BlockRoom = require("../models/Admin/blockRoomModel");
const Checkin = require("../models/Admin/checkinModel");
const Reservation = require("../models/Admin/reservationModel");
const RoomAdvance = require("../models/Admin/roomAdvanceModel");
const Hotel = require("../models/SuperAdmin/hotelModel");
const ServiceTransaction = require("../models/Admin/serviceTransactionModel");
const Folio = require("../models/Admin/folioModel");
const RoomLink = require("../models/Admin/roomLinkModel");
const FolioTransaction = require("../models/Admin/folioTransactionModel");
const Complaint = require("../models/Admin/complaintModel");
const OfferLog = require("../models/Admin/offerLogModel");
const NightAudit = require("../models/Admin/nightAuditModel");

const {
  getReservations,
  createReservation,
  getReservationById,
  updateReservation,
  cancelReservation,
} = require("../controllers/Admin/FrontOffice/Reservation/reservationController");

const {
  createCheckIn,
  expressCheckIn,
  addPaxCheckIn,
} = require("../controllers/Admin/FrontOffice/Reception/CheckIn/checkInController");

const { shiftRoom } = require("../controllers/Admin/FrontOffice/Reception/ShiftRoom/shiftRoomController");

const toNum = (value) => Number(value || 0);

const generateRooms = (startingRoomNumber, count, roomNumberFormat) => {
  const rooms = [];
  if (roomNumberFormat === "numeric") {
    let start = parseInt(startingRoomNumber, 10);
    if (Number.isNaN(start)) {
      return [];
    }
    for (let i = 0; i < count; i += 1) {
      rooms.push(String(start + i));
    }
    return rooms;
  }

  const match = String(startingRoomNumber).match(/^([A-Za-z]*)(\d+)$/);
  if (!match) {
    return [];
  }

  const prefix = match[1] || "";
  let number = parseInt(match[2], 10);
  const width = match[2].length;

  for (let i = 0; i < count; i += 1) {
    rooms.push(`${prefix}${String(number + i).padStart(width, "0")}`);
  }

  return rooms;
};

const ensureOpenFolioForCheckin = async (checkin, hotelId) => {
  if (!checkin) {
    return null;
  }

  let folio = await Folio.findOne({
    hotelId,
    checkinId: checkin._id,
    status: { $ne: "closed" },
  });

  if (folio) {
    return folio;
  }

  folio = await Folio.findOne({ hotelId, checkinId: checkin._id });
  if (folio) {
    if (folio.status === "closed") {
      return null;
    }
    return folio;
  }

  return Folio.create({
    hotelId,
    folioNumber: `FO-${String(checkin._id).slice(-8).toUpperCase()}`,
    checkinId: checkin._id,
    reservationId: checkin.reservationId || null,
    guestName: checkin.guestName,
    roomId: checkin.roomNumber || null,
    status: "open",
  });
};

const resolveFolioContext = async (folioId, hotelId) => {
  let folio = await Folio.findOne({ _id: folioId, hotelId });

  if (!folio) {
    folio = await Folio.findOne({ checkinId: folioId, hotelId });
  }

  if (!folio) {
    const directCheckin = await Checkin.findOne({ _id: folioId, hotelId });
    if (!directCheckin) {
      return null;
    }

    const activeRoom = directCheckin.roomNumber
      ? await Room.findOne({ _id: directCheckin.roomNumber, hotelId, status: "occupied" })
      : null;

    if (!activeRoom) {
      return null;
    }

    folio = await ensureOpenFolioForCheckin(directCheckin, hotelId);
    if (!folio) {
      return null;
    }
  }

  const checkin = await Checkin.findOne({ _id: folio.checkinId, hotelId });
  if (!checkin) {
    return null;
  }

  return { folio, checkin };
};

const buildFolioData = async (folioId, hotelId) => {
  const context = await resolveFolioContext(folioId, hotelId);
  if (!context) {
    return null;
  }

  const { folio, checkin } = context;

  const hydratedCheckin = await Checkin.findById(checkin._id)
    .populate("roomNumber", "roomNumber roomType")
    .populate("roomType", "name code")
    .populate("planType", "name code amount");

  const serviceCharges = await ServiceTransaction.find({ hotelId, room: hydratedCheckin.roomNumber?._id }).sort({ createdAt: 1 });
  const advances = await RoomAdvance.find({ hotelId, checkin: hydratedCheckin._id }).sort({ createdAt: 1 });
  const folioTransactions = await FolioTransaction.find({ hotelId, folioId: folio._id }).sort({ createdAt: 1 });

  const charges = [];
  const payments = [];

  serviceCharges.forEach((item) => {
    charges.push({
      id: item._id,
      date: item.createdAt,
      description: item.serviceName,
      quantity: item.qty,
      rate: item.amount,
      amount: item.total,
      total: item.total,
      category: "Service",
    });
  });

  folioTransactions.forEach((item) => {
    if (["room-tariff", "service-charge", "discount"].includes(item.type)) {
      charges.push({
        id: item._id,
        date: item.date,
        description: item.description,
        quantity: 1,
        rate: item.amount,
        amount: item.amount,
        total: item.totalAmount,
        category: item.type,
      });
      return;
    }

    payments.push({
      id: item._id,
      date: item.date,
      amount: item.totalAmount,
      mode: item.meta?.paymentMode || "Other",
      reference: item.meta?.reference || "",
      remarks: item.description,
    });
  });

  advances.forEach((item) => {
    payments.push({
      id: item._id,
      date: item.createdAt,
      amount: item.advanceAmount,
      mode: item.paymentMode,
      reference: item.bookingNo || "",
      remarks: item.remarks || "Room advance",
    });
  });

  const totalCharges = charges.reduce((sum, item) => sum + toNum(item.total), 0);
  const totalPayments = payments.reduce((sum, item) => sum + toNum(item.amount), 0);

  return {
    folioId: folio._id,
    folioNumber: folio.folioNumber,
    bookingId: hydratedCheckin.bookingNo || "",
    guest: {
      name: hydratedCheckin.guestName,
      email: hydratedCheckin.email,
      phone: hydratedCheckin.mobileNo,
      gstNumber: hydratedCheckin.gstNumber || "",
    },
    room: {
      roomNumber: hydratedCheckin.roomNumber?.roomNumber,
      roomType: hydratedCheckin.roomType?.name || hydratedCheckin.roomType?.code,
    },
    stay: {
      checkIn: hydratedCheckin.checkInDate,
      checkOut: null,
      nights: hydratedCheckin.nights || 0,
    },
    charges,
    payments,
    summary: {
      totalCharges,
      totalPayments,
      balance: totalCharges - totalPayments,
    },
    status: folio.status,
  };
};

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"), authorizeModule("front-office"));

// Floors
router.get("/floors", asyncHandler(async (req, res) => {
  const floors = await Floor.find({ hotelId: req.user.hotelId })
    .populate("roomConfigurations.roomTypeId", "name code")
    .sort({ floorNumber: 1 });

  res.json({ success: true, data: { floors } });
}));

router.post("/floors", asyncHandler(async (req, res) => {
  const floor = await Floor.create({
    hotelId: req.user.hotelId,
    name: req.body.name,
    floorNumber: req.body.floorNumber,
  });

  res.status(201).json({ success: true, data: floor });
}));

router.post("/floors/:floorId/room-config", asyncHandler(async (req, res) => {
  const { roomTypeId, count, startingRoomNumber, roomNumberFormat } = req.body;
  const hotelId = req.user.hotelId;
  const floor = await Floor.findOne({ _id: req.params.floorId, hotelId });

  if (!floor) {
    return res.status(404).json({ success: false, message: "Floor not found" });
  }

  const hotel = await Hotel.findById(hotelId);
  const currentRoomCount = await Room.countDocuments({ hotelId });
  const requestedCount = Number(count);

  if (currentRoomCount + requestedCount > hotel.totalRooms) {
    return res.status(400).json({ 
      success: false, 
      message: `Room limit reached. Total allowed: ${hotel.totalRooms}. Currently have: ${currentRoomCount}. Requested: ${requestedCount}.` 
    });
  }

  const roomType = await RoomType.findOne({ _id: roomTypeId, hotelId });
  if (!roomType) {
    return res.status(404).json({ success: false, message: "Room type not found" });
  }

  let actualStartingNumber = startingRoomNumber;
  if (roomNumberFormat === "numeric" || !roomNumberFormat) {
    const existingRooms = await Room.find({ hotelId, floor: floor.floorNumber });
    const numericRooms = existingRooms
      .map(r => parseInt(r.roomNumber, 10))
      .filter(n => !isNaN(n));
    
    if (numericRooms.length > 0) {
      const maxRoom = Math.max(...numericRooms);
      const requestedStart = parseInt(startingRoomNumber, 10);
      if (requestedStart <= maxRoom) {
        actualStartingNumber = String(maxRoom + 1);
      }
    }
  } else {
    // Alphanumeric case
    const match = String(startingRoomNumber).match(/^([A-Za-z]*)(\d+)$/);
    if (match) {
      const prefix = match[1] || "";
      const width = match[2].length;
      const existingRooms = await Room.find({ 
        hotelId, 
        floor: floor.floorNumber,
        roomNumber: { $regex: new RegExp(`^${prefix}\\d+$`) } 
      });
      
      const numericParts = existingRooms
        .map(r => {
          const m = r.roomNumber.match(/^([A-Za-z]*)(\d+)$/);
          return m ? parseInt(m[2], 10) : null;
        })
        .filter(n => n !== null);

      if (numericParts.length > 0) {
        const maxNum = Math.max(...numericParts);
        const requestedStartNum = parseInt(match[2], 10);
        if (requestedStartNum <= maxNum) {
          actualStartingNumber = `${prefix}${String(maxNum + 1).padStart(width, "0")}`;
        }
      }
    }
  }

  const rooms = generateRooms(actualStartingNumber, Number(count), roomNumberFormat || "numeric");
  if (!rooms.length) {
    return res.status(400).json({ success: false, message: "Invalid startingRoomNumber format" });
  }

  floor.roomConfigurations.push({
    roomTypeId,
    count: Number(count),
    startingRoomNumber,
    roomNumberFormat: roomNumberFormat || "numeric",
    rooms,
  });
  await floor.save();

  for (const roomNumber of rooms) {
    const exists = await Room.findOne({ hotelId: req.user.hotelId, roomNumber });
    if (!exists) {
      await Room.create({
        hotelId: req.user.hotelId,
        roomNumber,
        roomType: roomTypeId,
        floor: floor.floorNumber,
        rate: roomType.baseRate,
      });
    }
  }

  res.status(201).json({ success: true, data: floor });
}));


router.delete("/floors/:floorId/room-config/:roomTypeId", asyncHandler(async (req, res) => {
  const { floorId, roomTypeId } = req.params;
  const hotelId = req.user.hotelId;

  const floor = await Floor.findOne({ _id: floorId, hotelId });

  if (!floor) {
    return res.status(404).json({
      success: false,
      message: "Floor not found"
    });
  }

  const configToDelete = floor.roomConfigurations.find(
    (config) => config.roomTypeId.toString() === roomTypeId
  );

  if (!configToDelete) {
    return res.status(404).json({
      success: false,
      message: "Room config not found"
    });
  }

  await Room.deleteMany({
    hotelId,
    roomNumber: { $in: configToDelete.rooms }
  });

  floor.roomConfigurations = floor.roomConfigurations.filter(
    (config) => config.roomTypeId.toString() !== roomTypeId
  );

  await floor.save();

  res.json({
    success: true,
    message: "Room configuration deleted successfully"
  });
}));

// Room Types
router.get("/room-types", asyncHandler(async (req, res) => {
  const roomTypes = await RoomType.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { roomTypes } });
}));

router.post("/room-types", asyncHandler(async (req, res) => {
  const payload = { ...req.body, hotelId: req.user.hotelId };
  const roomType = await RoomType.create(payload);
  res.status(201).json({ success: true, data: roomType });
}));

// Rate Plans
router.get("/rate-plans", asyncHandler(async (req, res) => {
  const ratePlans = await RatePlan.find({ hotelId: req.user.hotelId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { ratePlans } });
}));

router.post("/rate-plans", asyncHandler(async (req, res) => {
  const payload = { ...req.body, hotelId: req.user.hotelId };
  const ratePlan = await RatePlan.create(payload);
  res.status(201).json({ success: true, data: ratePlan });
}));

// Rooms
router.get("/rooms", asyncHandler(async (req, res) => {
  const filter = { hotelId: req.user.hotelId };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.floor) {
    filter.floor = Number(req.query.floor);
  }

  if (req.query.roomType) {
    filter.roomType = req.query.roomType;
  }

  if (req.query.search) {
    filter.roomNumber = { $regex: req.query.search, $options: "i" };
  }

  const rooms = await Room.find(filter)
    .populate("roomType", "name code")
    .sort({ roomNumber: 1 });

  res.json({ success: true, data: { rooms } });
}));

router.get("/rooms/:roomId", asyncHandler(async (req, res) => {
  const room = await Room.findOne({
    _id: req.params.roomId,
    hotelId: req.user.hotelId,
  }).populate("roomType", "name code baseRate");

  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  res.json({ success: true, data: room });
}));

router.patch("/rooms/:roomId/status", asyncHandler(async (req, res) => {
  const { status } = req.body;
  const room = await Room.findOneAndUpdate(
    { _id: req.params.roomId, hotelId: req.user.hotelId },
    { status },
    { new: true }
  );

  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  res.json({ success: true, data: room });
}));

router.post("/rooms/:roomId/block", asyncHandler(async (req, res) => {
  const block = await BlockRoom.create({
    hotelId: req.user.hotelId,
    room: req.params.roomId,
    from: req.body.fromDate,
    to: req.body.toDate,
    remark: req.body.reason,
  });

  await Room.findByIdAndUpdate(req.params.roomId, { status: "blocked" });

  res.status(201).json({ success: true, data: block });
}));

router.delete("/rooms/:roomId/block", asyncHandler(async (req, res) => {
  const activeBlock = await BlockRoom.findOne({
    hotelId: req.user.hotelId,
    room: req.params.roomId,
    isActive: true,
  }).sort({ createdAt: -1 });

  if (!activeBlock) {
    return res.status(404).json({ success: false, message: "No active block found" });
  }

  activeBlock.isActive = false;
  await activeBlock.save();

  await Room.findByIdAndUpdate(req.params.roomId, { status: "available" });

  res.json({ success: true, message: "Room unblocked successfully" });
}));

// Reservations
router.get("/reservations", getReservations);
router.post("/reservations", createReservation);
router.get("/reservations/:id", getReservationById);
router.put("/reservations/:id", updateReservation);
router.post("/reservations/:id/cancel", cancelReservation);

// Check-In
router.post("/check-in", createCheckIn);
router.post("/check-in/express", expressCheckIn);
router.post("/check-in/:checkInId/pax", addPaxCheckIn);

// In-House Operations
router.get("/in-house", asyncHandler(async (req, res) => {
  const checkins = await Checkin.find({ hotelId: req.user.hotelId })
    .populate("roomNumber", "roomNumber roomType floor status hotelId")
    .populate("roomType", "name code")
    .sort({ createdAt: -1 });

  const filtered = checkins.filter((item) => {
    if (!item.roomNumber) return false;
    if (String(item.roomNumber.hotelId) !== String(req.user.hotelId)) return false;
    if (item.roomNumber.status !== "occupied") return false;
    if (req.query.floor && String(item.roomNumber.floor) !== String(req.query.floor)) return false;
    if (req.query.roomType && String(item.roomNumber.roomType) !== String(req.query.roomType)) return false;
    return true;
  });

  const folioPairs = await Promise.all(
    filtered.map(async (item) => {
      const folio = await ensureOpenFolioForCheckin(item, req.user.hotelId);
      return [String(item._id), folio];
    })
  );
  const folioByCheckin = new Map(folioPairs);

  const guests = filtered.map((item) => ({
    id: item._id,
    checkinId: item._id,
    folioId: folioByCheckin.get(String(item._id))?._id || item._id,
    bookingNo: item.bookingNo,
    bookingId: item.bookingNo,
    roomNumber: item.roomNumber?.roomNumber,
    roomId: item.roomNumber?._id,
    guestName: item.guestName,
    checkInDate: item.checkInDate,
    checkOutDate: new Date(new Date(item.checkInDate).getTime() + (item.nights || 0) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nights: item.nights || 0,
    guestClassification: item.guestClassification,
    classification: item.guestClassification,
    roomType: item.roomType,
    planType: item.planType,
    planCharges: item.planCharges || 0,
    advanceAmount: item.advanceAmount || 0,
  }));

  res.json({
    success: true,
    data: {
      guests,
      summary: {
        totalGuests: guests.length,
      },
    },
  });
}));

router.post("/in-house/:folioId/shift-room", asyncHandler(async (req, res, next) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  req.body.checkinId = context.checkin._id;
  req.body.newRoomNumber = req.body.newRoomId;
  const response = await shiftRoom(req, res, next);

  if (req.body.chargeToGuest && toNum(req.body.rateDifference) > 0) {
    await FolioTransaction.create({
      hotelId: req.user.hotelId,
      folioId: context.folio._id,
      checkin: context.checkin._id,
      type: "service-charge",
      description: "Room shift rate difference",
      amount: toNum(req.body.rateDifference),
      totalAmount: toNum(req.body.rateDifference),
      meta: {
        reason: req.body.reason,
      },
    });
  }

  return response;
}));

router.post("/in-house/:folioId/charges", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const checkin = await Checkin.findById(context.checkin._id).populate("roomNumber", "roomNumber");

  const charges = Array.isArray(req.body.charges) ? req.body.charges : [];
  if (!charges.length) {
    return res.status(400).json({ success: false, message: "charges array is required" });
  }

  const created = [];
  for (const charge of charges) {
    const quantity = toNum(charge.quantity || 1);
    const unitPrice = toNum(charge.unitPrice || charge.amount || 0);
    const amount = toNum(charge.amount || quantity * unitPrice);
    const taxAmount = toNum(charge.taxAmount || 0);
    const totalAmount = toNum(charge.totalAmount || amount + taxAmount);

    const service = await ServiceTransaction.create({
      hotelId: req.user.hotelId,
      serviceName: charge.serviceName || charge.description || "Service Charge",
      room: checkin.roomNumber?._id,
      qty: quantity,
      amount: unitPrice,
      total: totalAmount,
      remark: req.body.remarks || "",
      gstInclusive: true,
    });

    const folioTx = await FolioTransaction.create({
      hotelId: req.user.hotelId,
      folioId: context.folio._id,
      checkin: checkin._id,
      type: "service-charge",
      description: charge.description || charge.serviceName || "Service Charge",
      amount,
      taxAmount,
      totalAmount,
      meta: {
        serviceTransactionId: service._id,
        serviceCode: charge.serviceCode,
      },
    });

    created.push(folioTx);
  }

  res.status(201).json({ success: true, data: created });
}));

router.post("/in-house/:folioId/room-tariff", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const totalTax = toNum(req.body.taxes?.cgst) + toNum(req.body.taxes?.sgst);
  const totalAmount = toNum(req.body.totalAmount || (toNum(req.body.roomRate) + totalTax));

  const tx = await FolioTransaction.create({
    hotelId: req.user.hotelId,
    folioId: context.folio._id,
    checkin: context.checkin._id,
    type: "room-tariff",
    date: req.body.date || new Date(),
    description: req.body.remarks || "Room tariff",
    amount: toNum(req.body.roomRate),
    taxAmount: totalTax,
    totalAmount,
    meta: {
      taxes: req.body.taxes || {},
    },
  });

  res.status(201).json({ success: true, data: tx });
}));

router.post("/in-house/:folioId/payment", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const { checkin, folio } = context;

  const advance = await RoomAdvance.create({
    hotelId: req.user.hotelId,
    checkin: checkin._id,
    roomNumber: checkin.roomNumber,
    bookingNo: checkin.bookingNo,
    guestName: checkin.guestName,
    advanceAmount: toNum(req.body.amount),
    paymentMode: req.body.paymentMode,
    remarks: req.body.remarks,
  });

  await FolioTransaction.create({
    hotelId: req.user.hotelId,
    folioId: folio._id,
    checkin: checkin._id,
    type: "payment",
    description: req.body.remarks || "Room advance/payment",
    amount: toNum(req.body.amount),
    totalAmount: toNum(req.body.amount),
    meta: {
      paymentMode: req.body.paymentMode,
      paymentDetails: req.body.paymentDetails || {},
      receiptNumber: req.body.receiptNumber || "",
    },
  });

  res.status(201).json({ success: true, data: advance });
}));

router.post("/in-house/:folioId/extend", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const { checkin, folio } = context;
  const additionalNights = toNum(req.body.additionalNights);
  const additionalTariff = toNum(req.body.additionalTariff);

  checkin.nights = additionalNights + toNum(checkin.nights);
  checkin.remarks = req.body.reason || checkin.remarks;
  await checkin.save();

  if (additionalTariff > 0) {
    await FolioTransaction.create({
      hotelId: req.user.hotelId,
      folioId: folio._id,
      checkin: checkin._id,
      type: "room-tariff",
      description: `Extension Charge (${additionalNights} nights) - ${req.body.extensionType || "Manual"}`,
      amount: additionalTariff,
      totalAmount: additionalTariff,
      meta: {
        extensionType: req.body.extensionType,
        additionalNights,
        reason: req.body.reason,
      },
    });
  }

  res.json({ success: true, data: checkin });
}));

router.get("/in-house/link-rooms", asyncHandler(async (req, res) => {
  const links = await RoomLink.find({ hotelId: req.user.hotelId, isActive: true })
    .populate({
      path: "masterFolioId",
      populate: [
        { path: "checkinId", populate: "roomNumber" },
        { path: "roomId" }
      ]
    })
    .populate({
      path: "linkedFolioIds",
      populate: [
        { path: "checkinId", populate: "roomNumber" },
        { path: "roomId" }
      ]
    });

  res.json({ success: true, data: links });
}));

router.post("/in-house/link-rooms", asyncHandler(async (req, res) => {
  const { masterFolioId, linkedFolioIds, billingInstructions, linkType } = req.body;

  const link = await RoomLink.findOneAndUpdate(
    { hotelId: req.user.hotelId, masterFolioId, isActive: true },
    {
      $set: {
        billingInstructions,
        linkType,
        isActive: true,
      },
      $addToSet: {
        linkedFolioIds: { $each: linkedFolioIds }
      }
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, data: link });
}));

router.delete("/in-house/link-rooms/:masterFolioId", asyncHandler(async (req, res) => {
  const link = await RoomLink.findOne({ hotelId: req.user.hotelId, masterFolioId: req.params.masterFolioId, isActive: true });
  if (!link) {
    return res.status(404).json({ success: false, message: "Link not found" });
  }

  const folioIdsToUnlink = Array.isArray(req.body.folioIdsToUnlink) ? req.body.folioIdsToUnlink : [];
  if (folioIdsToUnlink.length) {
    link.linkedFolioIds = link.linkedFolioIds.filter(
      (id) => !folioIdsToUnlink.includes(String(id))
    );
  } else {
    link.linkedFolioIds = [];
  }

  if (!link.linkedFolioIds.length) {
    link.isActive = false;
  }

  await link.save();
  res.json({ success: true, data: link });
}));

// Check-Out and Settlement
router.get("/folio/:folioId", asyncHandler(async (req, res) => {
  const folio = await buildFolioData(req.params.folioId, req.user.hotelId);
  if (!folio) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  res.json({ success: true, data: { folio } });
}));

router.post("/folio/:folioId/discount", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const discountAmount = Math.abs(toNum(req.body.discountValue));
  const tx = await FolioTransaction.create({
    hotelId: req.user.hotelId,
    folioId: context.folio._id,
    checkin: context.checkin._id,
    type: "discount",
    description: req.body.reason || "Discount",
    amount: -discountAmount,
    totalAmount: -discountAmount,
    meta: {
      discountType: req.body.discountType,
      appliedOn: req.body.appliedOn,
      approvedBy: req.body.approvedBy,
    },
  });

  res.status(201).json({ success: true, data: tx });
}));

router.post("/folio/:folioId/settle", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const { checkin, folio } = context;

  // Handle discount if provided
  const discountAmount = toNum(req.body.discount);
  if (discountAmount > 0) {
    await FolioTransaction.create({
      hotelId: req.user.hotelId,
      folioId: folio._id,
      checkin: checkin._id,
      type: "discount",
      description: req.body.discountReason || "Discount at settlement",
      amount: -discountAmount,
      totalAmount: -discountAmount,
      meta: {
        appliedAt: "settlement",
      },
    });
  }

  const payments = Array.isArray(req.body.payments) ? req.body.payments : [];
  const created = [];
  for (const payment of payments) {
    const tx = await FolioTransaction.create({
      hotelId: req.user.hotelId,
      folioId: folio._id,
      checkin: checkin._id,
      type: "settlement",
      description: req.body.remarks || "Folio settlement",
      amount: toNum(payment.amount),
      totalAmount: toNum(payment.amount),
      meta: {
        paymentMode: payment.mode,
        cardType: payment.cardType,
        cardLastFour: payment.cardLastFour,
        transactionId: payment.transactionId,
        settlementType: req.body.settlementType,
        ledgerAc: payment.ledgerAc,
      },
    });
    created.push(tx);
  }

  const isFullSettlement = req.body.settlementType === "Full";
  if (isFullSettlement) {
    folio.status = "settled";
    await folio.save();

    // If requested to check-out automatically
    if (req.body.performCheckOut) {
      if (checkin.roomNumber) {
        await Room.findByIdAndUpdate(checkin.roomNumber, {
          status: "available",
          hkStatus: "dirty",
        });
      }

      if (checkin.bookingNo) {
        await Reservation.findOneAndUpdate(
          { reservationId: checkin.bookingNo },
          { status: "checked-out" }
        );
      }

      checkin.remarks = req.body.remarks || checkin.remarks;
      await checkin.save();
      
      folio.status = "closed";
      await folio.save();
    }
  }

  res.status(201).json({ 
    success: true, 
    data: created, 
    checkOutPerformed: !!req.body.performCheckOut && isFullSettlement 
  });
}));

router.post("/check-out", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.body.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const { checkin, folio } = context;

  if (checkin.roomNumber) {
    await Room.findByIdAndUpdate(checkin.roomNumber, {
      status: "available",
      hkStatus: "dirty",
    });
  }

  if (checkin.bookingNo) {
    await Reservation.findOneAndUpdate(
      { reservationId: checkin.bookingNo },
      { status: "checked-out" }
    );
  }

  checkin.remarks = req.body.guestFeedback?.comments || checkin.remarks;
  await checkin.save();
  folio.status = "closed";
  await folio.save();

  res.json({
    success: true,
    data: {
      checkOutId: `CO-${String(checkin._id).slice(-8).toUpperCase()}`,
      bookingId: checkin.bookingNo,
      checkOutTime: req.body.actualCheckOutTime || new Date(),
    },
  });
}));

router.post("/folio/:folioId/paidout", asyncHandler(async (req, res) => {
  const context = await resolveFolioContext(req.params.folioId, req.user.hotelId);
  if (!context) {
    return res.status(404).json({ success: false, message: "Folio not found" });
  }

  const amount = Math.abs(toNum(req.body.amount));
  const type = req.body.type === "Refund" ? "refund" : "paidout";

  const tx = await FolioTransaction.create({
    hotelId: req.user.hotelId,
    folioId: context.folio._id,
    checkin: context.checkin._id,
    type,
    description: req.body.reason || req.body.remarks || type,
    amount: -amount,
    totalAmount: -amount,
    meta: {
      paymentMode: req.body.paymentMode,
      approvedBy: req.body.approvedBy,
      remarks: req.body.remarks,
    },
  });

  res.status(201).json({ success: true, data: tx });
}));

// Complaints
router.post("/complaints", asyncHandler(async (req, res) => {
  let folioId = null;
  let checkinId = req.body.folioId || null;

  if (req.body.folioId) {
    const context = await resolveFolioContext(req.body.folioId, req.user.hotelId);
    if (context) {
      folioId = context.folio._id;
      checkinId = context.checkin._id;
    }
  }

  const complaint = await Complaint.create({
    hotelId: req.user.hotelId,
    folioId,
    checkin: checkinId,
    guestName: req.body.guestName,
    roomNumber: req.body.roomNumber,
    category: req.body.category,
    priority: req.body.priority,
    subject: req.body.subject,
    description: req.body.description,
    reportedAt: req.body.reportedAt || new Date(),
    reportedTo: req.body.reportedTo,
  });

  res.status(201).json({ success: true, data: complaint });
}));

router.patch("/complaints/:complaintId", asyncHandler(async (req, res) => {
  const payload = {
    status: req.body.status,
    resolution: req.body.resolution,
    resolvedBy: req.body.resolvedBy,
    resolvedAt: req.body.resolvedAt,
    compensationProvided: req.body.compensationProvided,
  };

  const complaint = await Complaint.findByIdAndUpdate(req.params.complaintId, payload, { new: true });
  if (!complaint) {
    return res.status(404).json({ success: false, message: "Complaint not found" });
  }

  res.json({ success: true, data: complaint });
}));

router.get("/complaints", asyncHandler(async (req, res) => {
  const filter = { hotelId: req.user.hotelId };
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }

  const complaints = await Complaint.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: { complaints } });
}));

// Offers and Communication
router.post("/offers/send", asyncHandler(async (req, res) => {
  const { targetType, guestIds, channel, offer } = req.body;

  if (!channel || !offer) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const offerLog = await OfferLog.create({
    hotelId: req.user.hotelId,
    targetType,
    guestIds: guestIds || [],
    channel,
    offer,
    status: "sent",
    sentBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Offer sent successfully",
    data: offerLog,
  });
}));

router.get("/offers", asyncHandler(async (req, res) => {
  const offers = await OfferLog.find({
    hotelId: req.user.hotelId,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: offers,
  });
}));

// Night Audit
router.get("/night-audit/status", asyncHandler(async (req, res) => {
  const today = req.query.date || new Date().toISOString().slice(0, 10);
  const audit = await NightAudit.findOne({
    hotelId: req.user.hotelId,
    auditDate: today,
  }).populate("completedBy", "name username");

  res.json({ success: true, data: audit });
}));

router.post("/night-audit/run", asyncHandler(async (req, res) => {
  const rooms = await Room.find({ hotelId: req.user.hotelId });
  const occupied = rooms.filter((item) => item.status === "occupied").length;
  const totalRooms = rooms.length;

  const today = req.body.auditDate || new Date().toISOString().slice(0, 10);
  const start = new Date(`${today}T00:00:00.000Z`);
  const end = new Date(`${today}T23:59:59.999Z`);

  const todayCharges = await FolioTransaction.find({
    hotelId: req.user.hotelId,
    createdAt: { $gte: start, $lte: end },
    type: { $in: ["room-tariff", "service-charge"] },
  });

  const roomRevenue = todayCharges
    .filter((item) => item.type === "room-tariff")
    .reduce((sum, item) => sum + toNum(item.totalAmount), 0);

  const otherRevenue = todayCharges
    .filter((item) => item.type === "service-charge")
    .reduce((sum, item) => sum + toNum(item.totalAmount), 0);

  const summary = {
    roomsOccupied: occupied,
    occupancyRate: totalRooms ? Number(((occupied / totalRooms) * 100).toFixed(2)) : 0,
    totalRoomRevenue: roomRevenue,
    totalOtherRevenue: otherRevenue,
    totalRevenue: roomRevenue + otherRevenue,
    discrepancies: 0,
  };

  const audit = await NightAudit.create({
    hotelId: req.user.hotelId,
    auditDate: today,
    tasks: req.body.tasks || {},
    status: "Completed",
    summary,
    reports: {
      dailyRevenueReport: `/reports/revenue?date=${today}`,
      occupancyReport: `/reports/occupancy?date=${today}`,
      managerReport: `/reports/dashboard?date=${today}`,
    },
    completedBy: req.user._id,
    completedAt: new Date(),
  });

  res.status(201).json({ success: true, data: audit });
}));

// Get Paidout/Refund Transactions
router.get("/paidout-refund", asyncHandler(async (req, res) => {
  const transactions = await FolioTransaction.find({
    hotelId: req.user.hotelId,
    type: { $in: ["paidout", "refund"] },
  })
    .populate("folioId", "roomNumber guestName")
    .populate("checkin", "guestName roomNumber")
    .sort({ createdAt: -1 });

  const formatted = transactions.map((t) => ({
    _id: t._id,
    type: t.type,
    roomNo: t.folioId?.roomNumber || t.checkin?.roomNumber || "N/A",
    guestName: t.folioId?.guestName || t.checkin?.guestName || "N/A",
    amount: Math.abs(toNum(t.totalAmount)),
    reason: t.description,
    date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
    approvedBy: t.meta?.approvedBy || "Admin",
  }));

  res.status(200).json({ success: true, data: formatted });
}));

module.exports = router;
