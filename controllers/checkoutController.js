const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Folio = require("../models/Admin/folioModel");
const Checkin = require("../models/Admin/checkinModel");
const Reservation = require("../models/Admin/reservationModel");
const Room = require("../models/Admin/roomModel");
const Invoice = require("../models/Admin/invoiceModel");
const Payment = require("../models/Admin/paymentModel");
const RoomAdvance = require("../models/Admin/roomAdvanceModel");
const CompanyLedger = require("../models/Admin/companyLedgerModel");
const FolioTransaction = require("../models/Admin/folioTransactionModel");
const AuditLog = require("../models/AuditLog");
const { calculateGSTBreakdown } = require("../utils/gstCalculator");
const { generateCheckoutInvoicePdf } = require("../utils/invoiceGenerator");

const ALLOWED_PAYMENT_MODES = new Set(["cash", "upi", "card"]);
const ALLOWED_ROOM_STATUS = new Set(["dirty", "clean"]);
const ALLOWED_BILLING_TYPES = new Set(["full", "split", "company"]);

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

function getBusinessDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildInvoiceItems(roomCharges, serviceCharges, cgst, sgst) {
  return [
    {
      description: "Room Charges",
      quantity: 1,
      rate: roomCharges,
      amount: roomCharges,
      total: roomCharges,
    },
    {
      description: "Service Charges",
      quantity: 1,
      rate: serviceCharges,
      amount: serviceCharges,
      total: serviceCharges,
    },
    {
      description: "CGST (6%)",
      quantity: 1,
      rate: cgst,
      amount: cgst,
      cgstRate: 6,
      cgstAmount: cgst,
      total: cgst,
    },
    {
      description: "SGST (6%)",
      quantity: 1,
      rate: sgst,
      amount: sgst,
      sgstRate: 6,
      sgstAmount: sgst,
      total: sgst,
    },
  ];
}

function normalizeCompanions(companions = []) {
  if (!Array.isArray(companions)) return [];
  return companions
    .filter((companion) => companion && typeof companion === "object")
    .map((companion) => ({
      name: String(companion.name || "").trim(),
      mobile: String(companion.mobile || "").trim(),
      gender: String(companion.gender || "").trim(),
      type: String(companion.type || "").trim(),
      idType: String(companion.idType || "").trim(),
      idNumber: String(companion.idNumber || "").trim(),
      separateBill: companion.separateBill === true,
    }))
    .filter((companion) => companion.name || companion.mobile || companion.idNumber);
}

function buildCompanionInvoiceItems(amount = 0) {
  const normalizedAmount = Number(Math.max(0, toNum(amount)).toFixed(2));
  return [
    {
      description: "Companion Billing Folio",
      quantity: 1,
      rate: normalizedAmount,
      amount: normalizedAmount,
      total: normalizedAmount,
    },
  ];
}

exports.completeCheckout = async (req, res) => {
  let session = null;

  try {
    const hotelId = req.user.hotelId;
    const {
      folioId,
      actualCheckOutTime,
      billingType = "full",
      splitBilling = [],
      companyBilling = {},
      payment = {},
      validations = {},
      adjustments = {},
      roomStatusAfterCheckout = "dirty",
      invoice = {},
      guestFeedback = {},
    } = req.body || {};

    if (!folioId) {
      return res.status(400).json({ success: false, message: "folioId is required" });
    }

    if (!ALLOWED_BILLING_TYPES.has(String(billingType || "").toLowerCase())) {
      return res.status(400).json({ success: false, message: "Invalid billing type" });
    }

    const normalizedBillingType = String(billingType || "full").toLowerCase();

    if (validations.minibarChecked === false) {
      return res.status(400).json({ success: false, message: "Minibar must be verified before checkout" });
    }

    if (validations.roomInspected === false) {
      return res.status(400).json({ success: false, message: "Room inspection is required before checkout" });
    }

    const housekeepingStatus = String(roomStatusAfterCheckout || "dirty").toLowerCase();
    if (!ALLOWED_ROOM_STATUS.has(housekeepingStatus)) {
      return res.status(400).json({ success: false, message: "Invalid room status after checkout" });
    }

    const folio = await Folio.findOne({ _id: folioId, hotelId });
    if (!folio) {
      return res.status(404).json({ success: false, message: "Folio not found" });
    }

    if (folio.status === "closed") {
      return res.status(409).json({ success: false, message: "Folio already checked out" });
    }

    const checkin = await Checkin.findOne({ _id: folio.checkinId, hotelId });
    if (!checkin) {
      return res.status(404).json({ success: false, message: "Check-in record not found for folio" });
    }

    const groupCheckins = checkin.bookingGroupId
      ? await Checkin.find({
          hotelId,
          bookingGroupId: checkin.bookingGroupId,
          status: { $ne: "checked-out" },
          guestType: { $ne: "PAX" },
        }).populate("roomNumber", "roomNumber")
      : [checkin];
    const groupCheckinIds = groupCheckins.map((item) => item._id);
    const groupFolios = await Folio.find({
      hotelId,
      checkinId: { $in: groupCheckinIds },
      status: { $ne: "closed" },
    });
    const groupFolioIds = groupFolios.map((item) => item._id);

    const folioCharges = await FolioTransaction.find({
      hotelId,
      folioId: { $in: groupFolioIds.length ? groupFolioIds : [folio._id] },
      type: { $in: ["room-tariff", "service-charge"] },
    });

    const postedRoomCharges = folioCharges
      .filter((tx) => tx.type === "room-tariff")
      .reduce((sum, tx) => sum + toNum(tx.totalAmount || tx.amount), 0);
    const bookedRoomCharges = groupCheckins.reduce(
      (sum, item) => sum + Math.max(0, toNum(item.planCharges) + toNum(item.foodCharges) - toNum(item.discount)),
      0
    );
    const roomCharges = postedRoomCharges || bookedRoomCharges;
    const serviceCharges = folioCharges
      .filter((tx) => tx.type === "service-charge")
      .reduce((sum, tx) => sum + toNum(tx.totalAmount || tx.amount), 0);

    const baseAmount = roomCharges + serviceCharges;
    const gstBreakdown = calculateGSTBreakdown(baseAmount);
    const { gstAmount, cgst, sgst, totalAmount } = gstBreakdown;
    const roundedTotalAmount = Number(totalAmount.toFixed(2));
    const roundedCgst = Number(cgst.toFixed(2));
    const roundedSgst = Number(sgst.toFixed(2));
    const roundedGstAmount = Number(gstAmount.toFixed(2));
    const extraCharges = Math.max(
      0,
      toNum(adjustments.minibarCharges) +
        toNum(adjustments.damageCharges) +
        toNum(adjustments.lateCheckoutCharges) +
        toNum(adjustments.extraManualCharges)
    );
    const discount = Math.max(0, toNum(adjustments.discount));
    const adjustedTotalAmount = Number(Math.max(0, roundedTotalAmount + extraCharges - discount).toFixed(2));
    const normalizedCompanions = normalizeCompanions(checkin.companions);
    const mainBillCompanions = normalizedCompanions.filter((companion) => !companion.separateBill);
    const separateBillCompanions = normalizedCompanions.filter((companion) => companion.separateBill);

    const advanceDocs = await RoomAdvance.find({
      hotelId,
      checkin: { $in: groupCheckinIds },
    });
    const advancePaid = Number(advanceDocs.reduce((sum, item) => sum + toNum(item.advanceAmount), 0).toFixed(2));
    const amountDue = Number(Math.max(0, adjustedTotalAmount - advancePaid).toFixed(2));

    let totalPaid = 0;
    let refund = 0;
    let paymentStatus = "pending";
    let paymentRecords = [];
    let companyLedgerPayload = null;
    const splitRows = Array.isArray(splitBilling) ? splitBilling : [];

    if (normalizedBillingType === "full") {
      const paymentMode = String(payment.mode || "").toLowerCase();
      if (!ALLOWED_PAYMENT_MODES.has(paymentMode)) {
        return res.status(400).json({ success: false, message: "Invalid payment mode for full billing" });
      }
      const amountPaid = toNum(payment.amountPaid);
      if (amountPaid < amountDue) {
        return res.status(400).json({ success: false, message: "Payment incomplete" });
      }

      totalPaid = amountPaid;
      refund = amountPaid > amountDue ? amountPaid - amountDue : 0;
      paymentStatus = "paid";
      paymentRecords = [
        {
          hotelId,
          folioId: folio._id,
          payerName: checkin.guestName || "Guest",
          amount: amountDue,
          paid: amountPaid,
          mode: paymentMode,
          refund,
          billingType: "full",
          recordedBy: req.user._id || null,
        },
      ];
    } else if (normalizedBillingType === "split") {
      if (!splitRows.length) {
        return res.status(400).json({ success: false, message: "Split billing allocations are required" });
      }

      const computedSplitTotal = splitRows.reduce((sum, row) => sum + toNum(row.amount), 0);
      if (Math.abs(computedSplitTotal - amountDue) > 0.01) {
        return res.status(400).json({
          success: false,
          message: "Split allocation total mismatch",
          data: { expected: amountDue, received: computedSplitTotal },
        });
      }
      const hasInvalidMode = splitRows.some((row) => !ALLOWED_PAYMENT_MODES.has(String(row.mode || "").toLowerCase()));
      if (hasInvalidMode) {
        return res.status(400).json({ success: false, message: "Invalid payment mode in split billing rows" });
      }
      const hasInvalidAmount = splitRows.some((row) => toNum(row.amount) <= 0);
      if (hasInvalidAmount) {
        return res.status(400).json({ success: false, message: "Each split billing row must have amount greater than zero" });
      }

      paymentStatus = "paid";
      totalPaid = computedSplitTotal;
      paymentRecords = splitRows.map((row) => {
        const mode = String(row.mode || "").toLowerCase();
        return {
          hotelId,
          folioId: folio._id,
          payerName: String(row.name || "Guest").trim() || "Guest",
          amount: toNum(row.amount),
          paid: toNum(row.amount),
          mode,
          refund: 0,
          billingType: "split",
          recordedBy: req.user._id || null,
        };
      });
    } else {
      if (toNum(payment.amountPaid) > 0) {
        return res.status(400).json({ success: false, message: "Company billing cannot accept guest payment" });
      }
      const companyId = String(companyBilling.companyId || "").trim();
      const companyName = String(companyBilling.companyName || "").trim();
      const gstin = String(companyBilling.gstin || "").trim();
      const billingAddress = String(companyBilling.billingAddress || "").trim();

      if (!companyId || !companyName) {
        return res.status(400).json({ success: false, message: "Company details are required for company billing" });
      }

      totalPaid = 0;
      paymentStatus = "pending_company";
      companyLedgerPayload = {
        hotelId,
        companyId,
        companyName,
        gstin,
        billingAddress,
        folioId: folio._id,
        amount: amountDue,
        status: "pending",
      };
    }

    const normalizedCheckoutTime = actualCheckOutTime ? new Date(actualCheckOutTime) : new Date();
    const invoiceTimestamp = Date.now();
    const invoiceNumber = `INV-${invoiceTimestamp}`;
    let createdInvoice = null;
    const createdCompanionInvoices = [];

    const writeCheckoutRecords = async (activeSession = null) => {
      const writeOptions = activeSession ? { session: activeSession } : {};

      folio.status = "closed";
      folio.actualCheckOutTime = normalizedCheckoutTime;
      folio.finalAmount = adjustedTotalAmount;
      folio.discount = discount;
      folio.extraCharges = extraCharges;
      folio.paymentStatus = paymentStatus;
      folio.billingType = normalizedBillingType;
      folio.gst = {
        cgst: roundedCgst,
        sgst: roundedSgst,
      };
      folio.checkoutMeta = {
        gst: roundedGstAmount,
        cgst: roundedCgst,
        sgst: roundedSgst,
        roomCharges,
        serviceCharges,
        extraCharges,
        discount,
        advancePaid,
        amountDue,
        bookingGroupId: checkin.bookingGroupId || "",
        linkedRooms: groupCheckins.map((item) => ({
          checkinId: String(item._id),
          bookingId: item.bookingNumber || item.bookingNo || "",
          roomNumber: item.roomNumber?.roomNumber || "",
          roomCharges: Math.max(0, toNum(item.planCharges) + toNum(item.foodCharges) - toNum(item.discount)),
        })),
        payment: paymentRecords.map((row) => ({
          payerName: row.payerName,
          mode: row.mode,
          amount: row.amount,
          paid: row.paid,
        })),
        validations: {
          minibarChecked: validations.minibarChecked !== false,
          roomInspected: validations.roomInspected !== false,
          keyCardsReturned: toNum(validations.keyCardsReturned),
        },
        roomStatusAfterCheckout: housekeepingStatus,
        invoice: {
          required: !!invoice.required,
          email: !!invoice.email,
        },
        guestFeedback: {
          rating: toNum(guestFeedback.rating),
          comment: guestFeedback.comment || "",
        },
        companionBilling: {
          mainGuestBill: {
            guestName: checkin.guestName || "N/A",
            companions: mainBillCompanions,
          },
          separateBills: separateBillCompanions.map((companion, index) => ({
            ...companion,
            invoiceNumber: `INV-${invoiceTimestamp}-C${index + 1}`,
          })),
        },
        billingType: normalizedBillingType,
        splitBilling: normalizedBillingType === "split" ? splitRows : [],
        companyBilling: normalizedBillingType === "company" ? companyLedgerPayload : null,
      };
      await folio.save(writeOptions);

      if (paymentRecords.length) {
        await Payment.create(paymentRecords, writeOptions);
      }
      if (companyLedgerPayload) {
        await CompanyLedger.create([companyLedgerPayload], writeOptions);
      }

      await FolioTransaction.create(
        [
          {
            hotelId,
            folioId: folio._id,
            checkin: checkin._id,
            type: "settlement",
            description: "Checkout settlement",
            amount: amountDue,
            totalAmount: amountDue,
            date: normalizedCheckoutTime,
            meta: {
              paymentType: normalizedBillingType,
              amountPaid: totalPaid,
              refund,
              billing: folio.checkoutMeta,
            },
          },
        ],
        writeOptions
      );

      if (invoice.required !== false) {
        const pdfInfo = await generateCheckoutInvoicePdf({
          invoiceNumber,
          invoiceDate: normalizedCheckoutTime,
          hotelName: req.user.hotelName || "Hotel",
          hotelAddress: req.user.hotelAddress || "",
          hotelGstin: req.user.gstin || "",
          guestName: checkin.guestName || "N/A",
          billToName: checkin.guestName || "N/A",
          includedCompanions: mainBillCompanions,
          roomNumber: groupCheckins.map((item) => item.roomNumber?.roomNumber || item.roomNumber || "").filter(Boolean).join(", ") || String(checkin.roomNumber || folio.roomId || ""),
          stayDuration: `${toNum(checkin.nights || 1)} night(s)`,
          roomCharges,
          serviceCharges,
          cgst: roundedCgst,
          sgst: roundedSgst,
          totalAmount: roundedTotalAmount,
          paymentSummary: normalizedBillingType === "company"
            ? "Pending to Company"
            : `Collected Rs ${toNum(totalPaid).toFixed(2)} via ${normalizedBillingType === "split" ? "multiple modes" : paymentRecords[0].mode.toUpperCase()}`,
        });

        const [invoiceDoc] = await Invoice.create(
          [
            {
              hotelId,
              invoiceNumber,
              folioId: folio._id,
              invoiceType: "Checkout",
              customerId: String(checkin._id),
              bookingId: checkin.bookingGroupId || checkin.bookingNumber || checkin.bookingNo || "",
              invoiceDate: normalizedCheckoutTime,
              dueDate: normalizedCheckoutTime,
              items: buildInvoiceItems(roomCharges, serviceCharges, roundedCgst, roundedSgst),
              subtotal: baseAmount,
              totalTax: roundedGstAmount,
              cgst: roundedCgst,
              sgst: roundedSgst,
              grandTotal: adjustedTotalAmount,
              amountPaid: Math.min(adjustedTotalAmount, advancePaid + totalPaid),
              balanceDue: Math.max(0, adjustedTotalAmount - advancePaid - totalPaid),
              pdfPath: pdfInfo.relativePath,
              notes: invoice.email ? "Email invoice requested" : "",
              sentMeta: {
                emailRequested: !!invoice.email,
                companionBilling: {
                  billRole: "main_guest",
                  includedCompanions: mainBillCompanions,
                  separateCompanionCount: separateBillCompanions.length,
                },
              },
            },
          ],
          writeOptions
        );
        createdInvoice = invoiceDoc;

        for (let index = 0; index < separateBillCompanions.length; index += 1) {
          const companion = separateBillCompanions[index];
          const companionInvoiceNumber = `INV-${invoiceTimestamp}-C${index + 1}`;
          const companionItems = buildCompanionInvoiceItems(0);
          const companionPdfInfo = await generateCheckoutInvoicePdf({
            title: "Separate Companion Bill",
            invoiceNumber: companionInvoiceNumber,
            invoiceDate: normalizedCheckoutTime,
            hotelName: req.user.hotelName || "Hotel",
            hotelAddress: req.user.hotelAddress || "",
            hotelGstin: req.user.gstin || "",
            guestName: checkin.guestName || "N/A",
            billToName: companion.name || "Companion",
            roomNumber: groupCheckins.map((item) => item.roomNumber?.roomNumber || item.roomNumber || "").filter(Boolean).join(", ") || String(checkin.roomNumber || folio.roomId || ""),
            stayDuration: `${toNum(checkin.nights || 1)} night(s)`,
            roomCharges: 0,
            serviceCharges: 0,
            cgst: 0,
            sgst: 0,
            totalAmount: 0,
            paymentSummary: "Separate companion folio created. Companion-specific charges can be settled independently.",
            notes: `Main Guest: ${checkin.guestName || "N/A"}`,
          });

          const [companionInvoiceDoc] = await Invoice.create(
            [
              {
                hotelId,
                invoiceNumber: companionInvoiceNumber,
                folioId: folio._id,
                invoiceType: "Checkout Companion",
                customerId: String(checkin._id),
                guestName: companion.name || "Companion",
                customerName: companion.name || "Companion",
                bookingId: checkin.bookingGroupId || checkin.bookingNumber || checkin.bookingNo || "",
                invoiceDate: normalizedCheckoutTime,
                dueDate: normalizedCheckoutTime,
                items: companionItems,
                subtotal: 0,
                totalTax: 0,
                cgst: 0,
                sgst: 0,
                grandTotal: 0,
                amountPaid: 0,
                balanceDue: 0,
                pdfPath: companionPdfInfo.relativePath,
                status: "paid",
                notes: `Separate bill for companion. Main Guest: ${checkin.guestName || "N/A"}`,
                sentMeta: {
                  emailRequested: !!invoice.email,
                  companionBilling: {
                    billRole: "separate_companion",
                    companion,
                    mainGuestName: checkin.guestName || "N/A",
                  },
                },
              },
            ],
            writeOptions
          );
          createdCompanionInvoices.push(companionInvoiceDoc);
        }
      }

      const roomId = folio.roomId || checkin.roomNumber || null;
      if (roomId) {
        await Room.updateOne(
          { _id: roomId, hotelId },
          { status: "available", hkStatus: housekeepingStatus },
          writeOptions
        );
      }

      const bookingReference = checkin.bookingNumber || checkin.bookingNo;
      if (bookingReference) {
        await Reservation.findOneAndUpdate(
          { hotelId, $or: [{ reservationId: bookingReference }, { bookingNumber: bookingReference }] },
          { status: "checked-out" },
          writeOptions
        );
      }

      await Checkin.updateOne(
        { _id: checkin._id, hotelId },
        { status: "checked-out", remarks: guestFeedback.comment || checkin.remarks || "" },
        writeOptions
      );

      await Checkin.updateMany(
        { mainCheckin: checkin._id, hotelId },
        { status: "checked-out", guestType: "Checked-Out" },
        writeOptions
      );

      await AuditLog.create(
        [
          {
            hotelId,
            businessDateKey: getBusinessDateKey(),
            level: "info",
            step: "checkout.complete",
            message: "Checkout completed with server-side billing reconciliation",
            context: {
              folioId: String(folio._id),
              checkinId: String(checkin._id),
              invoiceGenerated: invoice.required !== false,
              billingType: normalizedBillingType,
              totalAmount: roundedTotalAmount,
              finalAmount: adjustedTotalAmount,
              advancePaid,
              amountDue,
              amountPaid: totalPaid,
              refund,
              roomStatusAfterCheckout: housekeepingStatus,
            },
          },
        ],
        writeOptions
      );
    };

    try {
      session = await mongoose.startSession();
      await session.withTransaction(() => writeCheckoutRecords(session));
    } catch (transactionError) {
      const message = String(transactionError?.message || "");
      if (!message.includes("Transaction numbers are only allowed on a replica set member or mongos")) {
        throw transactionError;
      }
      if (session) {
        await session.endSession();
        session = null;
      }
      await writeCheckoutRecords(null);
    }

    return res.json({
      success: true,
      data: {
        checkOutId: `CO-${String(checkin._id).slice(-8).toUpperCase()}`,
        bookingId: checkin.bookingNumber || checkin.bookingNo,
        checkOutTime: normalizedCheckoutTime,
        billingType: normalizedBillingType,
        invoiceId: createdInvoice?._id || null,
        invoiceDownloadUrl: createdInvoice?._id ? `/front-office/check-out/invoices/${createdInvoice._id}/download` : null,
        companionInvoices: createdCompanionInvoices.map((item) => ({
          invoiceId: item._id,
          invoiceNumber: item.invoiceNumber,
          guestName: item.guestName,
          invoiceDownloadUrl: `/front-office/check-out/invoices/${item._id}/download`,
        })),
        totals: {
          roomCharges,
          serviceCharges,
          cgst: roundedCgst,
          sgst: roundedSgst,
          gst: roundedGstAmount,
          finalAmount: roundedTotalAmount,
          adjustedFinalAmount: adjustedTotalAmount,
          advancePaid,
          amountDue,
          amountPaid: totalPaid,
          refund,
        },
      },
    });
  } catch (error) {
    console.error("completeCheckout failed:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Checkout failed",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

exports.downloadCheckoutInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, hotelId: req.user.hotelId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (!invoice.pdfPath) {
      return res.status(404).json({ success: false, message: "Invoice PDF not generated" });
    }

    const absolutePath = path.join(process.cwd(), invoice.pdfPath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: "Invoice file missing" });
    }

    return res.download(absolutePath, `${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    console.error("downloadCheckoutInvoice failed:", error);
    return res.status(500).json({ success: false, message: "Failed to download invoice" });
  }
};
