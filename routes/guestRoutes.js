const express = require("express");
const asyncHandler = require("express-async-handler");
const Guest = require("../models/Admin/guestModel");
const Checkin = require("../models/Admin/checkinModel");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

const formatGuest = (guest) => ({
  id: String(guest._id),
  fullName: guest.fullName || "",
  guestName: guest.fullName || "",
  email: guest.email || "",
  phone: guest.phone || "",
  mobile: guest.phone || "",
  title: guest.title || "",
  gender: guest.gender || "",
  nationality: guest.nationality || "",
  address: guest.address || "",
  country: guest.country || "",
  state: guest.state || "",
  city: guest.city || "",
  zip: guest.zip || "",
  company: guest.company || "",
  gstNumber: guest.gstNumber || "",
  gstIn: guest.gstNumber || "",
  referredBy: guest.referredBy || "",
  referredName: guest.referredName || "",
  idProofType: guest.idType || "",
  idProofNumber: guest.idNumber || "",
});

router.use(protect, authorizeRoles("hoteladmin", "staff", "superadmin"));

router.get("/by-mobile", asyncHandler(async (req, res) => {
  const mobile = String(req.query.mobile || "").trim();
  if (!mobile) {
    return res.status(400).json({ success: false, message: "Mobile number is required" });
  }

  let guest = await Guest.findOne({ hotelId: req.user.hotelId, phone: mobile });

  if (!guest) {
    const checkin = await Checkin.findOne({ hotelId: req.user.hotelId, mobileNo: mobile }).sort({ createdAt: -1 });
    if (checkin) {
      guest = await Guest.findOneAndUpdate(
        { hotelId: req.user.hotelId, phone: mobile },
        {
          $set: {
            title: checkin.title || "",
            fullName: checkin.guestName,
            email: checkin.email || "",
            phone: mobile,
            gender: checkin.gender || "",
            nationality: checkin.nationality || "",
            address: checkin.address || "",
            country: checkin.country || "",
            state: checkin.state || "",
            city: checkin.city || "",
            zip: checkin.zip || "",
            company: checkin.company || "",
            gstNumber: checkin.gstNumber || "",
            referredBy: checkin.referredBy || "",
            referredName: checkin.referredName || "",
            idType: "other",
            idNumber: checkin.idProofNumber || "",
          },
          $setOnInsert: {
            visits: 0,
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  res.json({
    success: true,
    exists: Boolean(guest),
    data: guest ? formatGuest(guest) : null,
  });
}));

module.exports = router;
