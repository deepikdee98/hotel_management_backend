require("dotenv").config();
const mongoose = require("mongoose");
const SetupOption = require("../models/Admin/setupOptionModel");
const Hotel = require("../models/SuperAdmin/hotelModel");

const uri = process.env.CONNECTION_STRING || "mongodb://127.0.0.1:27017/hotel_management";

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

  for (const group of defaultOptions) {
    for (const value of group.values) {
      const exists = await SetupOption.exists({
        hotelId,
        type: group.type,
        normalizedValue: value.toLowerCase(),
      });

      if (!exists) {
        await SetupOption.create({
          hotelId,
          module: group.module,
          type: group.type,
          value,
          isActive: true,
        });
        inserted += 1;
      }
    }
  }

  console.log(inserted ? `Seeded ${inserted} setup options for hotel ${hotelId}.` : `Setup options already exist for hotel ${hotelId}.`);
}

async function seedSetupOptions() {
  try {
    await mongoose.connect(uri);

    const requestedHotelId = process.env.HOTEL_ID || process.argv[2];
    const hotelIds = requestedHotelId
      ? [String(requestedHotelId)]
      : (await Hotel.find({}, "_id")).map((hotel) => String(hotel._id));

    if (!hotelIds.length) {
      console.log("No hotels found. Create a hotel or pass HOTEL_ID before seeding setup options.");
      return;
    }

    for (const hotelId of hotelIds) {
      await seedForHotel(hotelId);
    }
  } catch (error) {
    console.error("Failed to seed setup options:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

seedSetupOptions();
