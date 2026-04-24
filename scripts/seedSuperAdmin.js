require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/userModel");

let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (error) {
  bcrypt = require("bcryptjs");
}

const uri = process.env.CONNECTION_STRING || "mongodb://127.0.0.1:27017/hotel_management";

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(uri);

    const email = "superadmin@hotel.com";
    const plainPassword = "admin@123";
    const password = await bcrypt.hash(plainPassword, 10);

    const existing = await User.findOne({ email });

    if (existing) {
      existing.password = password;
      existing.role = "superadmin";
      existing.isActive = true;
      existing.hotelId = null;
      existing.tokenVersion = 0;
      if (!existing.username) {
        existing.username = "Super Admin";
      }
       existing.phone = existing.phone || "+1 (555) 123-4567";
       existing.timezone = existing.timezone || "UTC-5 (Eastern Time)";
       existing.avatar = existing.avatar || "";
      await existing.save();
      console.log(`Updated super admin credentials for ${email}`);
    } else {
      await User.create({
        username: "Super Admin",
        email,
        password,
        role: "superadmin",
        hotelId: null,
        isActive: true,
        modules: [],
        tokenVersion: 0,
        phone: "+1 (555) 123-4567",
        timezone: "UTC-5 (Eastern Time)",
        avatar: ""
      });
      console.log(`Created super admin user ${email}`);
    }

    console.log("Credentials:");
    console.log(`email: ${email}`);
    console.log(`password: ${plainPassword}`);
  } catch (error) {
    console.error("Failed to seed super admin:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

seedSuperAdmin();
