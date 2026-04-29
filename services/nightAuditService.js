const Hotel = require("../models/SuperAdmin/hotelModel");
const Reservation = require("../models/Admin/reservationModel");
const Room = require("../models/Admin/roomModel");
const RoomType = require("../models/Admin/roomTypeModel");
const Transaction = require("../models/Transaction");
const SystemConfig = require("../models/SystemConfig");
const NightAuditReport = require("../models/NightAuditReport");
const AuditLog = require("../models/AuditLog");

const CHECKED_IN_STATUSES = ["checked-in", "CHECKED_IN"];
const CHECKED_OUT_STATUSES = ["checked-out", "CHECKED_OUT"];
const BOOKED_STATUSES = ["confirmed", "booked", "BOOKED"];
const CANCELLED_STATUSES = ["cancelled", "CANCELLED", "no-show", "NO_SHOW"];

const normalizeDate = (value) => {
  const date = new Date(value || new Date());
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getBusinessDateKey = (value) => normalizeDate(value).toISOString().slice(0, 10);

const getDayBounds = (value) => {
  const start = normalizeDate(value);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return { start, end };
};

const logAuditEvent = async ({ hotelId, businessDateKey, step, message, level = "info", context = {} }) => {
  const prefix = `[NightAudit][${businessDateKey}][${String(hotelId)}][${step}]`;

  if (level === "error") {
    console.error(prefix, message, context);
  } else {
    console.log(prefix, message, context);
  }

  await AuditLog.create({ hotelId, businessDateKey, step, message, level, context });
};

const recordStepError = async ({ errors, hotelId, businessDateKey, step, error, context = {} }) => {
  const message = `${step}: ${error.message}`;
  errors.push(message);
  await logAuditEvent({ hotelId, businessDateKey, step, message, level: "error", context });
};

const getOrCreateSystemConfig = async (hotelId) => {
  return SystemConfig.findOneAndUpdate(
    { hotelId },
    {
      $setOnInsert: {
        hotelId,
        currentBusinessDate: normalizeDate(new Date()),
      },
    },
    { upsert: true, returnDocument: "after" }
  );
};

const resolveRoomRate = async (reservation) => {
  if (reservation.room && typeof reservation.room.rate === "number") {
    return reservation.room.rate;
  }

  if (reservation.roomType && typeof reservation.roomType.baseRate === "number") {
    return reservation.roomType.baseRate;
  }

  if (reservation.roomType?._id) {
    const roomType = await RoomType.findById(reservation.roomType._id).select("baseRate").lean();
    return Number(roomType?.baseRate || 0);
  }

  return 0;
};

const postRoomCharges = async ({ hotelId, businessDate, businessDateKey, errors }) => {
  const checkedInReservations = await Reservation.find({
    hotelId,
    status: { $in: CHECKED_IN_STATUSES },
  })
    .populate("room", "rate status")
    .populate("roomType", "baseRate");

  let postedCount = 0;
  let totalRevenue = 0;

  for (const reservation of checkedInReservations) {
    try {
      const amount = Number(await resolveRoomRate(reservation));

      await Transaction.updateOne(
        {
          hotelId,
          bookingId: reservation._id,
          type: "ROOM_CHARGE",
          businessDateKey,
        },
        {
          $setOnInsert: {
            hotelId,
            bookingId: reservation._id,
            roomId: reservation.room?._id || null,
            type: "ROOM_CHARGE",
            amount,
            date: businessDate,
            businessDateKey,
            description: `Night audit room charge for booking ${reservation.reservationId || reservation._id}`,
            source: "night-audit",
          },
        },
        { upsert: true }
      );

      const transaction = await Transaction.findOne({
        hotelId,
        bookingId: reservation._id,
        type: "ROOM_CHARGE",
        businessDateKey,
      }).lean();

      if (transaction) {
        postedCount += 1;
        totalRevenue += Number(transaction.amount || 0);
      }
    } catch (error) {
      await recordStepError({
        errors,
        hotelId,
        businessDateKey,
        step: "postRoomCharges",
        error,
        context: { bookingId: reservation._id },
      });
    }
  }

  return { checkedInCount: checkedInReservations.length, postedCount, totalRevenue };
};

const handleNoShows = async ({ hotelId, businessDate, businessDateKey, errors }) => {
  try {
    const result = await Reservation.updateMany(
      {
        hotelId,
        status: { $in: BOOKED_STATUSES },
        checkInDate: { $lt: businessDate },
      },
      {
        $set: {
          status: "no-show",
        },
      }
    );

    return result.modifiedCount || 0;
  } catch (error) {
    await recordStepError({ errors, hotelId, businessDateKey, step: "handleNoShows", error });
    return 0;
  }
};

const updateRoomStatus = async ({ hotelId, businessDateKey, errors }) => {
  let availableUpdates = 0;
  let occupiedUpdates = 0;

  try {
    const checkedOutReservations = await Reservation.find({
      hotelId,
      status: { $in: CHECKED_OUT_STATUSES },
      room: { $ne: null },
    }).select("room");

    for (const reservation of checkedOutReservations) {
      const activeStay = await Reservation.exists({
        hotelId,
        room: reservation.room,
        status: { $in: CHECKED_IN_STATUSES },
      });

      if (!activeStay) {
        const updatedRoom = await Room.findOneAndUpdate(
          { _id: reservation.room, hotelId },
          { status: "available" },
          { new: true }
        );

        if (updatedRoom) {
          availableUpdates += 1;
        }
      }
    }

    const checkedInReservations = await Reservation.find({
      hotelId,
      status: { $in: CHECKED_IN_STATUSES },
      room: { $ne: null },
    }).select("room");

    for (const reservation of checkedInReservations) {
      const updatedRoom = await Room.findOneAndUpdate(
        { _id: reservation.room, hotelId },
        { status: "occupied" },
        { new: true }
      );

      if (updatedRoom) {
        occupiedUpdates += 1;
      }
    }
  } catch (error) {
    await recordStepError({ errors, hotelId, businessDateKey, step: "updateRoomStatus", error });
  }

  return { availableUpdates, occupiedUpdates };
};

const validateTransactions = async ({ hotelId, businessDateKey, errors }) => {
  const inconsistencies = [];

  try {
    const checkedInReservations = await Reservation.find({
      hotelId,
      status: { $in: CHECKED_IN_STATUSES },
    }).select("reservationId guestName");

    const charges = await Transaction.find({
      hotelId,
      type: "ROOM_CHARGE",
      businessDateKey,
    }).select("bookingId");

    const chargedBookingIds = new Set(charges.map((item) => String(item.bookingId)));

    for (const reservation of checkedInReservations) {
      if (!chargedBookingIds.has(String(reservation._id))) {
        inconsistencies.push(`Missing room charge for booking ${reservation.reservationId || reservation._id}`);
      }
    }

    for (const message of inconsistencies) {
      errors.push(message);
      await logAuditEvent({
        hotelId,
        businessDateKey,
        step: "validateTransactions",
        message,
        level: "error",
      });
    }
  } catch (error) {
    await recordStepError({ errors, hotelId, businessDateKey, step: "validateTransactions", error });
  }

  return inconsistencies;
};

const generateReport = async ({ hotelId, businessDate, businessDateKey, startedAt, triggeredBy, triggerSource, errors, stepResults }) => {
  const { start, end } = getDayBounds(businessDate);

  const [transactionStats, roomCount, checkedInCount, totalBookings] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          hotelId,
          businessDateKey,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          transactionsCount: { $sum: 1 },
        },
      },
    ]),
    Room.countDocuments({ hotelId }),
    Reservation.countDocuments({ hotelId, status: { $in: CHECKED_IN_STATUSES } }),
    Reservation.countDocuments({
      hotelId,
      status: { $nin: ["cancelled", "no-show", "CANCELLED", "NO_SHOW"] },
      checkInDate: { $lte: end },
      checkOutDate: { $gte: start },
    }),
  ]);

  const reportPayload = {
    hotelId,
    date: businessDate,
    businessDateKey,
    totalRevenue: Number(transactionStats[0]?.totalRevenue || 0),
    totalBookings,
    occupancyRate: roomCount ? Number(((checkedInCount / roomCount) * 100).toFixed(2)) : 0,
    noShowCount: Number(stepResults.noShowCount || 0),
    transactionsCount: Number(transactionStats[0]?.transactionsCount || 0),
    errors,
    status: errors.length ? "completed_with_errors" : "completed",
    startedAt,
    completedAt: new Date(),
    triggeredBy: triggeredBy || null,
    triggerSource,
    metadata: {
      checkedInCount,
      roomCount,
      postedRoomCharges: stepResults.postRoomCharges?.postedCount || 0,
      roomChargeRevenue: stepResults.postRoomCharges?.totalRevenue || 0,
      roomStatusUpdates: stepResults.roomStatusUpdates || {},
      inconsistencies: stepResults.inconsistencies || [],
    },
  };

  return NightAuditReport.create(reportPayload);
};

const rollBusinessDate = async ({ hotelId, businessDate, businessDateKey, errors }) => {
  try {
    const nextBusinessDate = normalizeDate(new Date(businessDate));
    nextBusinessDate.setUTCDate(nextBusinessDate.getUTCDate() + 1);

    await SystemConfig.updateOne(
      { hotelId },
      {
        $set: {
          currentBusinessDate: nextBusinessDate,
          lastNightAuditAt: new Date(),
        },
      }
    );

    await logAuditEvent({
      hotelId,
      businessDateKey,
      step: "rollBusinessDate",
      message: `Business date rolled to ${getBusinessDateKey(nextBusinessDate)}`,
    });

    return nextBusinessDate;
  } catch (error) {
    await recordStepError({ errors, hotelId, businessDateKey, step: "rollBusinessDate", error });
    return null;
  }
};

const runNightAudit = async ({ hotelId, triggeredBy = null, requestedBusinessDate = null, triggerSource = "manual" }) => {
  const startedAt = new Date();
  const hotel = await Hotel.findById(hotelId).select("_id status modules").lean();

  if (!hotel) {
    throw new Error("Hotel not found");
  }

  const systemConfig = await getOrCreateSystemConfig(hotelId);
  const businessDate = normalizeDate(requestedBusinessDate || systemConfig.currentBusinessDate);
  const businessDateKey = getBusinessDateKey(businessDate);

  const existingReport = await NightAuditReport.findOne({ hotelId, businessDateKey });
  if (existingReport) {
    return {
      alreadyRun: true,
      report: existingReport,
    };
  }

  const errors = [];
  const stepResults = {};

  await logAuditEvent({
    hotelId,
    businessDateKey,
    step: "runNightAudit",
    message: `Night audit started via ${triggerSource}`,
    context: { triggeredBy },
  });

  try {
    stepResults.postRoomCharges = await postRoomCharges({ hotelId, businessDate, businessDateKey, errors });
  } catch (error) {
    await recordStepError({ errors, hotelId, businessDateKey, step: "postRoomCharges", error });
  }

  stepResults.noShowCount = await handleNoShows({ hotelId, businessDate, businessDateKey, errors });
  stepResults.roomStatusUpdates = await updateRoomStatus({ hotelId, businessDateKey, errors });
  stepResults.inconsistencies = await validateTransactions({ hotelId, businessDateKey, errors });

  let report;
  try {
    report = await generateReport({
      hotelId,
      businessDate,
      businessDateKey,
      startedAt,
      triggeredBy,
      triggerSource,
      errors,
      stepResults,
    });
  } catch (error) {
    if (error.code === 11000) {
      report = await NightAuditReport.findOne({ hotelId, businessDateKey });
      return { alreadyRun: true, report };
    }

    throw error;
  }

  await rollBusinessDate({ hotelId, businessDate, businessDateKey, errors });

  if (errors.length !== report.errors.length) {
    report.errors = errors;
    report.status = errors.length ? "completed_with_errors" : "completed";
    report.completedAt = new Date();
    await report.save();
  }

  return {
    alreadyRun: false,
    report,
  };
};

const getNightAuditStatus = async ({ hotelId, businessDate = null }) => {
  const systemConfig = await getOrCreateSystemConfig(hotelId);
  const resolvedDate = normalizeDate(businessDate || systemConfig.currentBusinessDate);
  const businessDateKey = getBusinessDateKey(resolvedDate);

  const report = await NightAuditReport.findOne({ hotelId, businessDateKey }).sort({ createdAt: -1 });

  return {
    currentBusinessDate: systemConfig.currentBusinessDate,
    report,
  };
};

module.exports = {
  postRoomCharges,
  handleNoShows,
  updateRoomStatus,
  validateTransactions,
  generateReport,
  rollBusinessDate,
  runNightAudit,
  getNightAuditStatus,
  getBusinessDateKey,
  normalizeDate,
};
