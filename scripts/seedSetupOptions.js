const SetupOption = require("../models/Admin/setupOptionModel");
const Hotel = require("../models/SuperAdmin/hotelModel");

const defaultOptions = [
  { module: "payment", type: "paymentMode", values: ["Cash", "Card", "UPI"] },
  { module: "business", type: "referral", values: ["Walk-in", "Online"] },
  { module: "business", type: "purpose", values: ["Business", "Leisure"] },
  { module: "business", type: "businessSource", values: ["Direct", "OTA"] },
  { module: "business", type: "marketSegment", values: ["Corporate", "Retail"] },
  { module: "business", type: "checkoutPlan", values: ["Standard", "Late"] },
  { module: "business", type: "vehicleType", values: ["Car", "Bike"] },
  { module: "business", type: "ledgerGroup", values: ["General", "Corporate"] },
  { module: "business", type: "bookingCategory", values: ["Online", "Walk-in"] },
  { module: "guest", type: "guestType", values: ["Regular", "VIP"] },
  { module: "guest", type: "guestClassification", values: ["Individual", "Group"] },
  { module: "guest", type: "title", values: ["Mr", "Mrs", "Ms"] },
  { module: "guest", type: "gender", values: ["Male", "Female"] },
  { module: "guest", type: "nationality", values: ["Indian"] },
  { module: "guest", type: "country", values: ["India"] },
  { module: "guest", type: "idProof", values: ["Aadhaar", "Passport"] },
  { module: "payment", type: "ledgerAccount", values: ["Cash Account"] },
];

async function seedForHotel(hotelId) {
  let inserted = 0;
  let skipped = 0;

  for (const group of defaultOptions) {
    for (const value of group.values) {
      const normalizedValue = value.toLowerCase();
      const result = await SetupOption.updateOne(
        { hotelId: String(hotelId), type: group.type, normalizedValue },
        {
          $setOnInsert: {
            hotelId: String(hotelId),
            module: group.module,
            type: group.type,
            value,
            normalizedValue,
            isActive: true,
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount) inserted += 1;
      else skipped += 1;
    }
  }

  return { hotelId: String(hotelId), inserted, skipped };
}

module.exports = async function seedSetupOptions(options = {}) {
  const requestedHotelId = options.hotelId || process.env.HOTEL_ID;
  const hotelIds = requestedHotelId
    ? [String(requestedHotelId)]
    : (await Hotel.find({}, "_id")).map((hotel) => String(hotel._id));

  if (!hotelIds.length) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      message: "No hotels found. Create a hotel or pass HOTEL_ID to seed setup options.",
    };
  }

  const results = [];
  for (const hotelId of hotelIds) {
    results.push(await seedForHotel(hotelId));
  }

  const created = results.reduce((sum, item) => sum + item.inserted, 0);
  const skipped = results.reduce((sum, item) => sum + item.skipped, 0);

  return {
    created,
    updated: 0,
    skipped,
    details: results,
    message: `Setup options processed for ${hotelIds.length} hotel(s). Created: ${created}. Skipped: ${skipped}.`,
  };
};
