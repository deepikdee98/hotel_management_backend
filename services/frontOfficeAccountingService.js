const mongoose = require("mongoose");

const AccountsTransaction = require("../models/Admin/accountsTransactionModel");
const Expense = require("../models/Admin/expenseModel");
const Folio = require("../models/Admin/folioModel");
const Invoice = require("../models/Admin/invoiceModel");
const OutgoingPayment = require("../models/Admin/outgoingPaymentModel");
const Receipt = require("../models/Admin/receiptModel");
const Refund = require("../models/Admin/refundModel");
const AdvanceDeposit = require("../models/Admin/advanceDepositModel");
const CompanyBilling = require("../models/Admin/companyBillingModel");
const {
  calculateInvoiceTotals,
  getSettings,
  invoiceStatus,
  nextNumber,
  nextSequenceNumber,
  postLedgerEntry,
  toNum,
} = require("./accountsService");

const SOURCE_MODULE = "front-office";

function sessionOptions(session) {
  return session ? { session } : {};
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

async function resolveFolio({ hotelId, folioId, checkinId, session }) {
  if (folioId) {
    return Folio.findOne({ _id: folioId, hotelId }).session(session || null);
  }
  if (checkinId) {
    return Folio.findOne({ checkinId, hotelId }).session(session || null);
  }
  return null;
}

function sourceFields({ sourceId, folio }) {
  return {
    sourceModule: SOURCE_MODULE,
    sourceId: isObjectId(sourceId) ? sourceId : null,
    folioId: folio?._id || null,
    folioNumber: folio?.folioNumber || "",
  };
}

function paymentLedgerCode(paymentMode) {
  const mode = String(paymentMode || "").trim().toLowerCase();
  if (mode === "cash") return "1001";
  if (mode === "upi") return "1004";
  if (mode === "card" || mode === "credit card" || mode === "debit card") return "1005";
  return "1002";
}

function serviceRevenueCode(category, subCategory, description) {
  const text = `${category || ""} ${subCategory || ""} ${description || ""}`.toLowerCase();
  if (text.includes("food") || text.includes("restaurant") || text.includes("f&b")) return "4002";
  if (text.includes("room")) return "4001";
  return "4003";
}

async function postLedgerPair({ hotelId, businessId = "", date, description, reference, debit, credit }) {
  const tasks = [];
  if (debit?.amount > 0) {
    tasks.push(postLedgerEntry({
      hotelId,
      businessId,
      account: debit.account,
      fallbackCode: debit.fallbackCode,
      date,
      description,
      reference,
      debit: debit.amount,
      credit: 0,
    }));
  }
  if (credit?.amount > 0) {
    tasks.push(postLedgerEntry({
      hotelId,
      businessId,
      account: credit.account,
      fallbackCode: credit.fallbackCode,
      date,
      description,
      reference,
      debit: 0,
      credit: credit.amount,
    }));
  }
  await Promise.all(tasks);
}

async function findExisting(Model, hotelId, sourceId, session) {
  if (!isObjectId(sourceId)) return null;
  return Model.findOne({ hotelId, sourceModule: SOURCE_MODULE, sourceId }).session(session || null);
}

async function createOnce(Model, hotelId, sourceId, payload, session) {
  const existing = await findExisting(Model, hotelId, sourceId, session);
  if (existing) return { record: existing, created: false };

  const docs = await Model.create([payload], sessionOptions(session));
  return { record: docs[0], created: true };
}

async function postRoomAdvance({
  hotelId,
  businessId = "",
  sourceId,
  folioId,
  checkinId,
  guestName,
  amount,
  paymentMode,
  reference,
  ledgerAccount,
  panNo,
  remarks,
  userId,
  session,
}) {
  if (toNum(amount) <= 0) return { record: null, created: false };

  const folio = await resolveFolio({ hotelId, folioId, checkinId, session });
  const settings = await getSettings(hotelId);
  const receiptNumber = await nextNumber(hotelId, settings.receiptPrefix || "RCP-");
  const normalizedAmount = toNum(amount);

  const result = await createOnce(
    Receipt,
    hotelId,
    sourceId,
    {
      hotelId,
      businessId,
      receiptNumber,
      receiptType: "Room Advance",
      customerName: guestName,
      guestName,
      amount: normalizedAmount,
      paymentMode,
      reference,
      paymentDetails: {
        ledgerAccount: ledgerAccount || "",
        panNo: panNo || "",
      },
      remarks,
      receivedBy: userId,
      ...sourceFields({ sourceId, folio }),
    },
    session
  );

  if (result.created) {
    const depositNumber = await nextNumber(hotelId, settings.depositPrefix || "ADV-");
    const existingDeposit = isObjectId(sourceId)
      ? await AdvanceDeposit.findOne({ hotelId, reference: String(sourceId) }).session(session || null)
      : null;

    if (!existingDeposit) {
      await AdvanceDeposit.create([
        {
          hotelId,
          businessId,
          depositNumber,
          guestName: guestName || "Guest",
          folioId: folio?._id || folioId || null,
          date: new Date(),
          amount: normalizedAmount,
          balanceAmount: normalizedAmount,
          paymentMode,
          reference: String(reference || sourceId || ""),
          remarks,
          createdBy: userId,
        },
      ], sessionOptions(session));
    }

    await postLedgerPair({
      hotelId,
      businessId,
      date: result.record.createdAt || new Date(),
      description: remarks || "Room advance received",
      reference: String(reference || result.record.receiptNumber),
      debit: { fallbackCode: paymentLedgerCode(paymentMode), amount: normalizedAmount },
      credit: { fallbackCode: "2002", amount: normalizedAmount },
    });
  }

  return result;
}

async function createRevenueTransaction({
  hotelId,
  businessId = "",
  sourceId,
  folioId,
  checkinId,
  amount,
  paymentMode,
  reference,
  description,
  category,
  subCategory,
  ledgerAccount,
  taxableAmount,
  cgst,
  sgst,
  totalTax,
  userId,
  session,
}) {
  if (toNum(amount) <= 0) return { record: null, created: false };

  const folio = await resolveFolio({ hotelId, folioId, checkinId, session });
  const txNumber = await nextSequenceNumber(hotelId, "TXN", "TXN-", 3);
  const normalizedTax = toNum(totalTax || (toNum(cgst) + toNum(sgst)));
  const revenueAmount = Math.max(0, toNum(taxableAmount || amount) - (taxableAmount ? 0 : normalizedTax));
  const receivableAmount = revenueAmount + normalizedTax;
  const { record, created } = await createOnce(
    AccountsTransaction,
    hotelId,
    sourceId,
    {
      hotelId,
      businessId,
      transactionNumber: txNumber,
      date: new Date(),
      type: "Income",
      category,
      subCategory,
      description,
      reference,
      amount: revenueAmount,
      paymentMode,
      createdBy: userId,
      ledgerAccountId: isObjectId(ledgerAccount) ? ledgerAccount : null,
      ...sourceFields({ sourceId, folio }),
    },
    session
  );

  if (created) {
    await postLedgerPair({
      hotelId,
      businessId,
      date: record.date,
      description: record.description,
      reference: record.reference,
      debit: { fallbackCode: "1003", amount: receivableAmount },
      credit: {
        account: ledgerAccount,
        fallbackCode: category === "Room Revenue" ? "4001" : serviceRevenueCode(category, subCategory, description),
        amount: revenueAmount,
      },
    });

    if (normalizedTax > 0) {
      await postLedgerEntry({
        hotelId,
        businessId,
        fallbackCode: "2003",
        date: record.date,
        description: `${record.description} GST`,
        reference: record.reference,
        debit: 0,
        credit: normalizedTax,
      });
    }
  }

  return { record, created };
}

async function postRoomTariff(payload) {
  return createRevenueTransaction({
    ...payload,
    category: payload.category || "Room Revenue",
    description: payload.description || "Room tariff",
  });
}

async function postServiceCharge(payload) {
  return createRevenueTransaction({
    ...payload,
    category: payload.category || "Other Services",
    description: payload.description || "Service charge",
  });
}

async function postSettlement({
  hotelId,
  businessId = "",
  sourceId,
  folioId,
  checkinId,
  guestName,
  amount,
  paymentMode,
  reference,
  remarks,
  userId,
  session,
}) {
  const normalizedAmount = toNum(amount);
  if (normalizedAmount === 0) return { record: null, created: false };

  if (normalizedAmount >= 0) {
    const folio = await resolveFolio({ hotelId, folioId, checkinId, session });
    const settings = await getSettings(hotelId);
    const receiptNumber = await nextNumber(hotelId, settings.receiptPrefix || "RCP-");
    const result = await createOnce(
      Receipt,
      hotelId,
      sourceId,
      {
        hotelId,
        businessId,
        receiptNumber,
        receiptType: "Checkout Settlement",
        customerName: guestName,
        guestName,
        amount: normalizedAmount,
        paymentMode,
        reference,
        remarks: remarks || "Folio settlement",
        receivedBy: userId,
        ...sourceFields({ sourceId, folio }),
      },
      session
    );

    if (result.created) {
      await postLedgerPair({
        hotelId,
        businessId,
        date: result.record.createdAt || new Date(),
        description: remarks || "Folio settlement",
        reference: String(reference || result.record.receiptNumber),
        debit: { fallbackCode: paymentLedgerCode(paymentMode), amount: normalizedAmount },
        credit: { fallbackCode: "1003", amount: normalizedAmount },
      });
    }

    return result;
  }

  const folio = await resolveFolio({ hotelId, folioId, checkinId, session });
  return createOnce(
    OutgoingPayment,
    hotelId,
    sourceId,
    {
      hotelId,
      businessId,
      direction: "outgoing",
      paymentType: "Settlement Refund",
      vendorName: guestName || "Guest",
      category: "Guest Refund",
      description: remarks || "Folio settlement refund",
      amount: Math.abs(normalizedAmount),
      netPayment: Math.abs(normalizedAmount),
      paymentMode,
      utrNumber: reference,
      paymentDate: new Date(),
      createdBy: userId,
      ...sourceFields({ sourceId, folio }),
    },
    session
  );
}

async function postAdvanceApplication({ hotelId, businessId = "", folioId, amount, reference, remarks, session }) {
  const normalizedAmount = toNum(amount);
  if (normalizedAmount <= 0) return null;

  await postLedgerPair({
    hotelId,
    businessId,
    date: new Date(),
    description: remarks || "Advance applied to checkout",
    reference: String(reference || ""),
    debit: { fallbackCode: "2002", amount: normalizedAmount },
    credit: { fallbackCode: "1003", amount: normalizedAmount },
  });

  let remaining = normalizedAmount;
  const deposits = await AdvanceDeposit.find({
    hotelId,
    ...(folioId ? { folioId } : {}),
    status: { $in: ["open", "partially_refunded"] },
    balanceAmount: { $gt: 0 },
  }).sort({ date: 1 }).session(session || null);

  for (const deposit of deposits) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, toNum(deposit.balanceAmount));
    deposit.appliedAmount = toNum(deposit.appliedAmount) + applied;
    deposit.balanceAmount = Math.max(0, toNum(deposit.balanceAmount) - applied);
    deposit.status = deposit.balanceAmount > 0 ? "open" : "applied";
    await deposit.save(sessionOptions(session));
    remaining -= applied;
  }

  return { appliedAmount: normalizedAmount - remaining, unappliedAmount: remaining };
}

async function createCheckoutInvoice({
  hotelId,
  businessId = "",
  sourceId,
  folioId,
  checkinId,
  payload,
  userId,
  session,
}) {
  const folio = await resolveFolio({ hotelId, folioId, checkinId, session });
  const existing = await findExisting(Invoice, hotelId, sourceId, session);
  if (existing) return { record: existing, created: false };

  const totals = calculateInvoiceTotals(payload || {});
  const invoice = {
    ...(payload || {}),
    ...totals,
    hotelId,
    businessId,
    status: payload?.status || invoiceStatus(totals),
    createdBy: userId || payload?.createdBy || null,
    ...sourceFields({ sourceId, folio }),
  };

  const docs = await Invoice.create([invoice], sessionOptions(session));
  return { record: docs[0], created: true };
}

async function postCompanyBilling({
  hotelId,
  businessId = "",
  sourceId,
  invoice,
  companyBilling = {},
  userId,
  session,
}) {
  if (!invoice || toNum(invoice.balanceDue) <= 0) return { record: null, created: false };

  const existing = await CompanyBilling.findOne({ hotelId, invoiceIds: invoice._id }).session(session || null);
  if (existing) return { record: existing, created: false };

  const billNumber = await nextNumber(hotelId, "CB-");
  const docs = await CompanyBilling.create([
    {
      hotelId,
      businessId,
      billNumber,
      companyId: companyBilling.companyId || invoice.companyId,
      companyName: companyBilling.companyName || invoice.companyName,
      gstin: companyBilling.gstin || invoice.gstin || "",
      billingAddress: companyBilling.billingAddress || invoice.billingAddress || "",
      invoiceIds: [invoice._id],
      folioIds: invoice.folioId ? [invoice.folioId] : [],
      billDate: invoice.invoiceDate || new Date(),
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      totalTax: invoice.totalTax,
      grandTotal: invoice.grandTotal,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      status: invoice.balanceDue > 0 ? "sent" : "paid",
      createdBy: userId,
    },
  ], sessionOptions(session));

  return { record: docs[0], created: true };
}

async function postCheckoutInvoiceAccounting({
  hotelId,
  businessId = "",
  sourceId,
  invoice,
  roomCharges = 0,
  serviceCharges = 0,
  extraCharges = 0,
  cgst = 0,
  sgst = 0,
  discount = 0,
  userId,
  session,
}) {
  if (!invoice || !sourceId) return { record: null, created: false };

  const taxableTotal = Math.max(0, toNum(roomCharges) + toNum(serviceCharges) + toNum(extraCharges) - toNum(discount));
  const taxTotal = toNum(cgst) + toNum(sgst);
  const grossTotal = taxableTotal + taxTotal;
  if (grossTotal <= 0) return { record: null, created: false };

  const result = await createOnce(
    AccountsTransaction,
    hotelId,
    sourceId,
    {
      hotelId,
      businessId,
      transactionNumber: await nextSequenceNumber(hotelId, "TXN", "TXN-", 3),
      date: invoice.invoiceDate || new Date(),
      type: "Income",
      category: "Checkout Revenue",
      subCategory: invoice.billingType || "guest",
      description: `Checkout invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      amount: taxableTotal,
      paymentMode: invoice.billingType === "company" ? "company_credit" : "folio",
      createdBy: userId,
      ...sourceFields({ sourceId, folio: { _id: invoice.folioId, folioNumber: invoice.folioNumber } }),
    },
    session
  );

  if (!result.created) return result;

  await postLedgerEntry({
    hotelId,
    businessId,
    fallbackCode: "1003",
    date: result.record.date,
    description: result.record.description,
    reference: result.record.reference,
    debit: grossTotal,
    credit: 0,
  });

  await postLedgerEntry({
    hotelId,
    businessId,
    fallbackCode: "4001",
    date: result.record.date,
    description: "Checkout room revenue",
    reference: result.record.reference,
    debit: 0,
    credit: Math.max(0, toNum(roomCharges) - toNum(discount)),
  });

  if (toNum(serviceCharges) + toNum(extraCharges) > 0) {
    await postLedgerEntry({
      hotelId,
      businessId,
      fallbackCode: "4003",
      date: result.record.date,
      description: "Checkout service revenue",
      reference: result.record.reference,
      debit: 0,
      credit: toNum(serviceCharges) + toNum(extraCharges),
    });
  }

  if (taxTotal > 0) {
    await postLedgerEntry({
      hotelId,
      businessId,
      fallbackCode: "2003",
      date: result.record.date,
      description: "Checkout GST payable",
      reference: result.record.reference,
      debit: 0,
      credit: taxTotal,
    });
  }

  return result;
}

async function postRefund({
  hotelId,
  businessId = "",
  sourceId,
  folioId,
  checkinId,
  guestName,
  amount,
  paymentMode,
  reference,
  reason,
  userId,
  session,
}) {
  const folio = await resolveFolio({ hotelId, folioId, checkinId, session });
  const normalizedAmount = Math.abs(toNum(amount));
  if (normalizedAmount <= 0) return { record: null, created: false };

  const settings = await getSettings(hotelId);
  const refundNumber = await nextNumber(hotelId, settings.refundPrefix || "REF-");

  const refundResult = await createOnce(
    Refund,
    hotelId,
    sourceId,
    {
      hotelId,
      businessId,
      refundNumber,
      refundType: "guest_refund",
      guestName,
      folioId: folio?._id || folioId || null,
      amount: normalizedAmount,
      paymentMode,
      reference,
      reason: reason || "Paidout/refund",
      approvedBy: userId || null,
      createdBy: userId,
      ...sourceFields({ sourceId, folio }),
    },
    session
  );

  if (refundResult.created) {
    const txResult = await createOnce(
      AccountsTransaction,
      hotelId,
      sourceId,
      {
        hotelId,
        businessId,
        transactionNumber: await nextSequenceNumber(hotelId, "TXN", "TXN-", 3),
        date: new Date(),
        type: "Expense",
        category: "Guest Refund",
        description: reason || "Paidout/refund",
        reference,
        amount: normalizedAmount,
        paymentMode,
        createdBy: userId,
        ...sourceFields({ sourceId, folio }),
      },
      session
    );

    if (txResult.created) {
      await postLedgerPair({
        hotelId,
        businessId,
        date: txResult.record.date,
        description: txResult.record.description,
        reference: txResult.record.reference,
        debit: { fallbackCode: "5003", amount: txResult.record.amount },
        credit: { fallbackCode: paymentLedgerCode(paymentMode), amount: txResult.record.amount },
      });
    }

    await createOnce(
      Expense,
      hotelId,
      sourceId,
      {
        hotelId,
        businessId,
        date: new Date(),
        category: "Guest Refund",
        description: reason || "Paidout/refund",
        amount: normalizedAmount,
        paidTo: guestName || "Guest",
        paymentMode,
        billNumber: reference,
        createdBy: userId || null,
        ...sourceFields({ sourceId, folio }),
      },
      session
    );
  }

  return refundResult;
}

module.exports = {
  SOURCE_MODULE,
  postRoomAdvance,
  postRoomTariff,
  postServiceCharge,
  postSettlement,
  createCheckoutInvoice,
  postAdvanceApplication,
  postCheckoutInvoiceAccounting,
  postCompanyBilling,
  postRefund,
};
