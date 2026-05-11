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

const AUDIT_STEPS = [
  { id: "postRoomCharges", label: "Post pending room tariffs" },
  { id: "handleNoShows", label: "Process no-show reservations" },
  { id: "updateRoomStatus", label: "Update room availability" },
  { id: "validateTransactions", label: "Validate daily transactions" },
  { id: "generateReport", label: "Generate daily revenue report" },
  { id: "rollBusinessDate", label: "Roll business date forward" },
];

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

  await AuditLog.create({
    hotelId,
    businessDateKey,
    step,
    message,
    level,
    context,
    action: "SYSTEM",
    module: "NIGHT_AUDIT",
  });
};

const recordStepError = async ({ errors, hotelId, businessDateKey, step, error, context = {} }) => {
  const message = `${step}: ${error.message}`;
  errors.push(message);
  await logAuditEvent({ hotelId, businessDateKey, step, message, level: "error", context });
};

const updateReportStep = async (reportId, stepId, status, error = null) => {
  const update = {
    $set: {
      "steps.$[elem].status": status,
    },
  };
  if (status === "completed" || status === "failed") {
    update.$set["steps.$[elem].completedAt"] = new Date();
  }
  if (error) {
    update.$set["steps.$[elem].error"] = error;
  }

  await NightAuditReport.findByIdAndUpdate(reportId, update, {
    arrayFilters: [{ "elem.id": stepId }],
  });
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

const generateReport = async ({ hotelId, businessDate, businessDateKey, startedAt, triggeredBy, triggerSource, errors, stepResults, reportId }) => {
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

  const updatePayload = {
    totalRevenue: Number(transactionStats[0]?.totalRevenue || 0),
    totalBookings,
    occupancyRate: roomCount ? Number(((checkedInCount / roomCount) * 100).toFixed(2)) : 0,
    noShowCount: Number(stepResults.noShowCount || 0),
    transactionsCount: Number(transactionStats[0]?.transactionsCount || 0),
    errors,
    status: errors.length ? "completed_with_errors" : "completed",
    completedAt: new Date(),
    metadata: {
      checkedInCount,
      roomCount,
      postedRoomCharges: stepResults.postRoomCharges?.postedCount || 0,
      roomChargeRevenue: stepResults.postRoomCharges?.totalRevenue || 0,
      roomStatusUpdates: stepResults.roomStatusUpdates || {},
      inconsistencies: stepResults.inconsistencies || [],
    },
  };

  return NightAuditReport.findByIdAndUpdate(reportId, updatePayload, { new: true });
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

  let report = await NightAuditReport.findOne({ hotelId, businessDateKey });
  if (report && (report.status === "completed" || report.status === "completed_with_errors")) {
    return {
      alreadyRun: true,
      report,
    };
  }

  // Create or reset in_progress report
  if (!report) {
    report = await NightAuditReport.create({
      hotelId,
      date: businessDate,
      businessDateKey,
      status: "in_progress",
      startedAt,
      triggeredBy,
      triggerSource,
      steps: AUDIT_STEPS.map((s) => ({ ...s, status: "pending" })),
    });
  } else {
    report.status = "in_progress";
    report.startedAt = startedAt;
    report.triggeredBy = triggeredBy;
    report.triggerSource = triggerSource;
    report.steps = AUDIT_STEPS.map((s) => ({ ...s, status: "pending" }));
    report.errors = [];
    await report.save();
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
    await updateReportStep(report._id, "postRoomCharges", "in_progress");
    stepResults.postRoomCharges = await postRoomCharges({ hotelId, businessDate, businessDateKey, errors });
    await updateReportStep(report._id, "postRoomCharges", "completed");
  } catch (error) {
    await recordStepError({ errors, hotelId, businessDateKey, step: "postRoomCharges", error });
    await updateReportStep(report._id, "postRoomCharges", "failed", error.message);
  }

  try {
    await updateReportStep(report._id, "handleNoShows", "in_progress");
    stepResults.noShowCount = await handleNoShows({ hotelId, businessDate, businessDateKey, errors });
    await updateReportStep(report._id, "handleNoShows", "completed");
  } catch (error) {
    await updateReportStep(report._id, "handleNoShows", "failed", error.message);
  }

  try {
    await updateReportStep(report._id, "updateRoomStatus", "in_progress");
    stepResults.roomStatusUpdates = await updateRoomStatus({ hotelId, businessDateKey, errors });
    await updateReportStep(report._id, "updateRoomStatus", "completed");
  } catch (error) {
    await updateReportStep(report._id, "updateRoomStatus", "failed", error.message);
  }

  try {
    await updateReportStep(report._id, "validateTransactions", "in_progress");
    stepResults.inconsistencies = await validateTransactions({ hotelId, businessDateKey, errors });
    await updateReportStep(report._id, "validateTransactions", "completed");
  } catch (error) {
    await updateReportStep(report._id, "validateTransactions", "failed", error.message);
  }

  try {
    await updateReportStep(report._id, "generateReport", "in_progress");
    report = await generateReport({
      hotelId,
      businessDate,
      businessDateKey,
      startedAt,
      triggeredBy,
      triggerSource,
      errors,
      stepResults,
      reportId: report._id,
    });
    await updateReportStep(report._id, "generateReport", "completed");
  } catch (error) {
    await updateReportStep(report._id, "generateReport", "failed", error.message);
    if (error.code === 11000) {
      report = await NightAuditReport.findOne({ hotelId, businessDateKey });
      return { alreadyRun: true, report };
    }
    throw error;
  }

  try {
    await updateReportStep(report._id, "rollBusinessDate", "in_progress");
    await rollBusinessDate({ hotelId, businessDate, businessDateKey, errors });
    await updateReportStep(report._id, "rollBusinessDate", "completed");
  } catch (error) {
    await updateReportStep(report._id, "rollBusinessDate", "failed", error.message);
  }

  // Refresh report for final status if needed
  report = await NightAuditReport.findById(report._id);

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
