const Counter = require("../../../../../models/Admin/counterModel");

const generateBookingNumber = async (hotelId, session = null) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  const counter = await Counter.findOneAndUpdate(
    { hotelId, date: dateStr },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      session,
    }
  );

  const seq = String(counter.seq).padStart(3, "0");

  return `BK-${dateStr}-${seq}`;
};

module.exports = generateBookingNumber;