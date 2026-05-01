const SetupOption = require("../models/Admin/setupOptionModel");

const setupFieldTypeMap = {
  paymentMode: "paymentMode",
  referredBy: "referral",
  referral: "referral",
  guestType: "guestType",
  guestClassification: "guestClassification",
  bookingSource: "businessSource",
  businessSource: "businessSource",
  marketSegment: "marketSegment",
  purpose: "purpose",
  purposeOfVisit: "purpose",
  checkoutPlan: "checkoutPlan",
  idProof: "idProof",
  idProofType: "idProof",
  ledgerAccount: "ledgerAccount",
  title: "title",
  gender: "gender",
  nationality: "nationality",
  country: "country",
  vehicleType: "vehicleType",
  companyInfoLedgerGroup: "ledgerGroup",
  companyInfoBookingCategory: "bookingCategory",
};

async function optionExists({ hotelId, type, value }) {
  if (!value || String(value).trim() === "") return true;

  return Boolean(
    await SetupOption.exists({
      hotelId: String(hotelId),
      type,
      normalizedValue: String(value).trim().toLowerCase(),
      isActive: true,
    })
  );
}

async function validateSetupValues(hotelId, payload, fields = Object.keys(setupFieldTypeMap)) {
  for (const field of fields) {
    const type = setupFieldTypeMap[field];
    if (!type || payload[field] === undefined || payload[field] === null || payload[field] === "") {
      continue;
    }

    const exists = await optionExists({ hotelId, type, value: payload[field] });
    if (!exists) {
      throw new Error(`${field} must be a valid active setup option`);
    }
  }
}

module.exports = {
  setupFieldTypeMap,
  optionExists,
  validateSetupValues,
};
