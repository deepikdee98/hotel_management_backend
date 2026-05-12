const User = require("../models/userModel");

let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (error) {
  bcrypt = require("bcryptjs");
}

module.exports = async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@hotel.com";
  const plainPassword = process.env.SUPER_ADMIN_PASSWORD || "admin@123";
  const password = await bcrypt.hash(plainPassword, 10);

  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = password;
    existing.role = "superadmin";
    existing.isActive = true;
    existing.hotelId = null;
    existing.tokenVersion = 0;
    existing.username = existing.username && /^[a-zA-Z0-9_]+$/.test(existing.username)
      ? existing.username
      : "superadmin";
    existing.phone = existing.phone || "+1 (555) 123-4567";
    existing.timezone = existing.timezone || "UTC-5 (Eastern Time)";
    existing.avatar = existing.avatar || "";
    await existing.save();

    return {
      created: 0,
      updated: 1,
      skipped: 0,
      message: `Updated super admin credentials for ${email}`,
    };
  }

  await User.create({
    username: "superadmin",
    email,
    password,
    role: "superadmin",
    hotelId: null,
    isActive: true,
    modules: [],
    tokenVersion: 0,
    phone: "+1 (555) 123-4567",
    timezone: "UTC-5 (Eastern Time)",
    avatar: "",
  });

  return {
    created: 1,
    updated: 0,
    skipped: 0,
    message: `Created super admin user ${email}`,
  };
};
