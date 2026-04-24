const Guest = require("../../models/Admin/guestModel");


//@desc    Create Guest
//@route   POST /staff/guests
//@access  Private (Staff)
exports.createGuest = async (req, res) => {
  const {
    fullName,
    email,
    phone,
    idType,
    idNumber,
    address,
    nationality,
  } = req.body;

  if (!fullName) {
    res.status(400);
    throw new Error("Full name is required");
  }
  const existing = await Guest.findOne({
    phone,
    hotelId: req.user.hotelId,
  });

  if (existing) {
    res.status(400);
    throw new Error("Guest already exists with this phone");
  }

  const guest = await Guest.create({
    fullName,
    email,
    phone,
    idType,
    idNumber,
    address,
    nationality,
    hotelId: req.user.hotelId,
  });

  res.status(201).json({
    success: true,
    message: "Guest created successfully",
    guest,
  });
};



// @desc    get Guest
// @route   GET /staff/guests
// @access  Private (Staff)
exports.getGuests = async (req, res) => {
  const { search } = req.query;

  let query = {
    hotelId: req.user.hotelId,
  };

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const guests = await Guest.find(query).sort({ createdAt: -1 });
  const totalGuests = await Guest.countDocuments({
    hotelId: req.user.hotelId,
  });

  const repeatGuests = await Guest.countDocuments({
    hotelId: req.user.hotelId,
    visits: { $gt: 1 },
  });

  const revenueAgg = await Guest.aggregate([
    { $match: { hotelId: req.user.hotelId } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$totalSpent" },
        avgSpend: { $avg: "$totalSpent" },
      },
    },
  ]);

  const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
  const avgSpend = revenueAgg[0]?.avgSpend || 0;

  const formattedGuests = guests.map((g) => ({
    id: g._id,
    name: g.fullName,
    email: g.email,
    phone: g.phone,
    country: g.nationality,
    visits: g.visits,
    totalSpent: g.totalSpent,
  }));

  res.json({
    success: true,
    data: {
      stats: {
        totalGuests,
        repeatGuests,
        totalRevenue,
        avgSpend,
      },
      guests: formattedGuests,
    },
  });
};


// @desc    Update Guest
// @route   PUT /staff/guests/:id
// @access  Private (Staff)

exports.updateGuest = async (req, res) => {
  const guest = await Guest.findOne({
    _id: req.params.id,
    hotelId: req.user.hotelId,
  });

  if (!guest) {
    res.status(404);
    throw new Error("Guest not found");
  }

  const allowedFields = [
    "fullName",
    "email",
    "phone",
    "idType",
    "idNumber",
    "address",
    "nationality",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      guest[field] = req.body[field];
    }
  });

  const updated = await guest.save();

  res.json({
    success: true,
    message: "Guest updated successfully",
    guest: updated,
  });
};


// @desc    Delete Guest
// @route   DELETE /staff/guests/:id
// @access  Private (Staff)
exports.deleteGuest = async (req, res) => {
  const guest = await Guest.findOne({
    _id: req.params.id,
    hotelId: req.user.hotelId,
  });

  if (!guest) {
    res.status(404);
    throw new Error("Guest not found");
  }

  await guest.deleteOne();

  res.json({
    success: true,
    message: "Guest deleted successfully",
  });
};