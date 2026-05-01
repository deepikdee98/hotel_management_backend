/**
 * Checkout Calculator Service
 * Calculates checkout date and time based on checkout plan
 */

const calculateCheckoutDateTime = (checkInDateTime, checkoutPlanMetadata) => {
  if (!checkInDateTime) return null;
  
  const checkInDate = new Date(checkInDateTime);
  if (isNaN(checkInDate.getTime())) return null;

  let checkOutDate = new Date(checkInDate);

  if (!checkoutPlanMetadata || !checkoutPlanMetadata.type) {
    // Default to 24 hours if no plan or type
    checkOutDate.setHours(checkOutDate.getHours() + 24);
    return checkOutDate;
  }

  if (checkoutPlanMetadata.type === "duration") {
    const hours = Number(checkoutPlanMetadata.hours) || 24;
    checkOutDate.setHours(checkOutDate.getHours() + hours);
  } else if (checkoutPlanMetadata.type === "fixed") {
    // Set to next day with fixed time
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    
    if (checkoutPlanMetadata.time) {
      const [hours, minutes] = checkoutPlanMetadata.time.split(":").map(Number);
      checkOutDate.setHours(hours || 12, minutes || 0, 0, 0);
    } else {
      checkOutDate.setHours(12, 0, 0, 0); // Default to 12 Noon
    }
  }

  return checkOutDate;
};

module.exports = {
  calculateCheckoutDateTime,
};
