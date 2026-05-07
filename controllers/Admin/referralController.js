const Referral = require("../../models/Admin/referralModel");
const Company = require("../../models/Admin/companyModel");
const TravelAgent = require("../../models/Admin/travelAgentModel");

// @desc    Get Referrals with optional type filter
// @route   GET /api/referrals
// @access  Private
const getReferrals = async (req, res) => {
  try {
    const { type } = req.query;

    if (["Company", "Travel Agent", "OTA"].includes(type)) {
      const model = type === "Travel Agent" ? TravelAgent : Company;
      const filter = {
        hotelId: req.user.hotelId,
        status: true,
      };

      if (type !== "Travel Agent") {
        filter.type = type;
      }

      const registrations = await model.find(filter).sort({ name: 1 });

      const transformedReferrals = registrations.map(registration => ({
        _id: registration._id,
        name: registration.name,
        type,
        hotelId: registration.hotelId,
        code: registration.code,
        contactPerson: registration.contactPerson,
        phone: registration.phone,
        email: registration.email,
        gstNumber: registration.gstNumber,
        creditAllowed: registration.creditAllowed,
        creditLimit: registration.creditLimit,
      }));

      res.status(200).json(transformedReferrals);
      return;
    }

    let filter = { hotelId: req.user.hotelId, isActive: true };

    if (type) {
      filter.type = type;
    }

    const referrals = await Referral.find(filter).sort({ name: 1 });
    res.status(200).json(referrals);
  } catch (error) {
    console.error("Get Referrals Error:", error);
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
};

// @desc    Create a Referral
// @route   POST /api/referrals
// @access  Private
const createReferral = async (req, res) => {
  try {
    const referralData = {
      ...req.body,
      hotelId: req.user.hotelId,
    };

    const referral = await Referral.create(referralData);
    res.status(201).json(referral);
  } catch (error) {
    console.error("Create Referral Error:", error);
    res.status(500).json({ message: "Failed to create referral" });
  }
};

// @desc    Update a Referral
// @route   PUT /api/referrals/:id
// @access  Private
const updateReferral = async (req, res) => {
  try {
    const referral = await Referral.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      req.body,
      { new: true }
    );

    if (!referral) {
      return res.status(404).json({ message: "Referral not found" });
    }

    res.status(200).json(referral);
  } catch (error) {
    console.error("Update Referral Error:", error);
    res.status(500).json({ message: "Failed to update referral" });
  }
};

// @desc    Delete a Referral (Soft delete by setting isActive: false)
// @route   DELETE /api/referrals/:id
// @access  Private
const deleteReferral = async (req, res) => {
  try {
    const referral = await Referral.findOneAndUpdate(
      { _id: req.params.id, hotelId: req.user.hotelId },
      { isActive: false },
      { new: true }
    );

    if (!referral) {
      return res.status(404).json({ message: "Referral not found" });
    }

    res.status(200).json({ message: "Referral deleted successfully" });
  } catch (error) {
    console.error("Delete Referral Error:", error);
    res.status(500).json({ message: "Failed to delete referral" });
  }
};

module.exports = {
  getReferrals,
  createReferral,
  updateReferral,
  deleteReferral,
};
