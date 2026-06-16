const SetupOption = require("../models/Admin/setupOptionModel");

const defaultMasterData = [
  {
    module: "guest",
    type: "title",
    values: ["Mr", "Mrs", "Ms", "Dr", "Prof"],
  },
  {
    module: "guest",
    type: "gender",
    values: ["Male", "Female", "Other"],
  },
  {
    module: "guest",
    type: "nationality",
    values: ["Indian", "American", "British", "Australian", "Canadian", "Other"],
  },
  {
    module: "guest",
    type: "country",
    values: [
      "India",
      "United States",
      "United Kingdom",
      "Australia",
      "Canada",
      "United Arab Emirates",
      "Singapore",
      "Other",
    ],
  },
  {
    module: "business",
    type: "referral",
    values: ["Walk-in", "Website", "Travel Agent", "Corporate", "Friend/Family", "Online Booking", "Other"],
  },
  {
    module: "business",
    type: "purpose",
    values: ["Business", "Leisure", "Conference", "Wedding", "Medical", "Transit", "Other"],
  },
  {
    module: "business",
    type: "businessSource",
    values: ["Direct", "Travel Agent", "Corporate", "Website", "Walk-in", "Other"],
  },
  {
    module: "business",
    type: "marketSegment",
    values: ["Individual", "Corporate", "Group", "Travel Agent", "OTA", "Government", "Other"],
  },
  {
    module: "business",
    type: "checkoutPlan",
    values: ["12-Noon", "24noon"],
  },
  {
    module: "guest",
    type: "guestClassification",
    values: ["Regular", "VIP","Corporate Guest"],
  },
  {
    module: "guest",
    type: "guestType",
    values: ["Individual", "Company", "Group", "Travel Agent", "Complementary"],
  },
  {
    module: "payment",
    type: "paymentMode",
    values: ["Cash", "Credit Card", "Debit Card", "UPI"],
  },
  {
    module: "payment",
    type: "ledgerAccount",
    values: [
      "Room Revenue",
      "Food Revenue",
      "Laundry Revenue",
      "Telephone Revenue",
      "Miscellaneous Revenue",
      "CGST",
      "SGST",
      "IGST",
      "Advance Received",
      "Guest Ledger",
    ],
  },
  {
    module: "guest",
    type: "idProof",
    values: ["Aadhaar Card", "Passport", "Driving License", "Voter ID", "PAN Card", "Other"],
  },
  {
    module: "business",
    type: "vehicleType",
    values: ["Car", "Bike", "Bus", "Taxi", "Auto", "Other"],
  },
  {
    module: "business",
    type: "ledgerGroup",
    values: ["Assets", "Liabilities", "Income", "Expenses", "Tax", "Guest Ledger", "Corporate Ledger"],
  },
  {
    module: "business",
    type: "bookingCategory",
    values: ["Confirmed", "Tentative", "Waitlisted", "Guaranteed", "Non-Guaranteed", "Complementary"],
  },
  {
    module: "room",
    type: "occupancyType",
    values: ["Single", "Double", "Triple", "Quad", "Family", "Dormitory"],
  },
];

const toSeedRecords = (hotelId) =>
  defaultMasterData.flatMap(({ module, type, values }) =>
    values.map((value) => ({
      hotelId: String(hotelId),
      module,
      type,
      value,
      normalizedValue: value.trim().toLowerCase(),
      isActive: true,
      metadata: { seeded: true },
    }))
  );

async function seedDefaultMasterData(hotelId) {
  if (!hotelId) {
    throw new Error("hotelId is required to seed default master data");
  }

  const records = toSeedRecords(hotelId);
  if (!records.length) return { matched: 0, upserted: 0 };

  const result = await SetupOption.bulkWrite(
    records.map((record) => ({
      updateOne: {
        filter: {
          hotelId: record.hotelId,
          type: record.type,
          normalizedValue: record.normalizedValue,
        },
        update: {
          $setOnInsert: record,
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  return {
    matched: result.matchedCount || 0,
    upserted: result.upsertedCount || 0,
  };
}

module.exports = {
  defaultMasterData,
  seedDefaultMasterData,
};
