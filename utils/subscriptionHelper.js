const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const buildSubscriptionResult = ({ status, daysLeft = 0, message, hotel, isValid }) => ({
  status,
  daysLeft,
  message,
  isValid,
  expiryDate: hotel?.expiryDate || null,
});

const formatDayLabel = (days) => `${days} day${days === 1 ? "" : "s"}`;

const checkSubscriptionStatus = (hotel, graceDays = 3) => {
  if (!hotel) {
    return buildSubscriptionResult({
      status: "INACTIVE",
      message: "Hotel not found",
      isValid: false,
    });
  }

  if (hotel.isActive === false || ["inactive", "suspended"].includes(String(hotel.status || "").toLowerCase())) {
    return buildSubscriptionResult({
      status: "INACTIVE",
      message: "Your account has been deactivated. Please contact Super Admin.",
      hotel,
      isValid: false,
    });
  }

  if (!hotel.expiryDate || Number.isNaN(new Date(hotel.expiryDate).getTime())) {
    return buildSubscriptionResult({
      status: "INACTIVE",
      message: "Subscription expiry date is missing. Please contact Super Admin.",
      hotel,
      isValid: false,
    });
  }

  const currentDate = startOfLocalDay(new Date());
  const expiryDate = new Date(hotel.expiryDate);
  const expiryDay = startOfLocalDay(expiryDate);
  const daysLeft = Math.ceil((expiryDay.getTime() - currentDate.getTime()) / DAY_MS);

  if (daysLeft <= -graceDays) {
    return buildSubscriptionResult({
      status: "EXPIRED",
      daysLeft,
      message: "Subscription expired. Please contact Super Admin",
      hotel,
      isValid: false,
    });
  }

  if (daysLeft <= 0) {
    const graceDaysLeft = graceDays + daysLeft;
    return buildSubscriptionResult({
      status: "GRACE",
      daysLeft,
      message: `Subscription expired. ${formatDayLabel(graceDaysLeft)} left in grace period`,
      hotel,
      isValid: true,
    });
  }

  if (daysLeft <= 30) {
    return buildSubscriptionResult({
      status: "WARNING",
      daysLeft,
      message: ` Your subscription will expire in ${formatDayLabel(daysLeft)}`,
      hotel,
      isValid: true,
    });
  }

  return buildSubscriptionResult({
    status: "ACTIVE",
    daysLeft,
    message: "",
    hotel,
    isValid: true,
  });
};

module.exports = {
  checkSubscriptionStatus
};
