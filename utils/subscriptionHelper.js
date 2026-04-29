/**
 * Helper to check if a hotel subscription is valid
 * @param {Object} hotel - The hotel object from database
 * @param {Number} graceDays - Number of grace days after expiry (default 3)
 * @returns {Object} { isValid: boolean, status: string, message: string }
 */
const checkSubscriptionStatus = (hotel, graceDays = 3) => {
  if (!hotel) {
    return { isValid: false, status: 'NOT_FOUND', message: 'Hotel not found' };
  }

  if (!hotel.isActive) {
    return { isValid: false, status: 'INACTIVE', message: 'Your account has been deactivated. Please contact Super Admin.' };
  }

  const currentDate = new Date();
  const expiryDate = new Date(hotel.expiryDate);
  
  // Calculate grace period
  const expiryWithGrace = new Date(expiryDate);
  expiryWithGrace.setDate(expiryWithGrace.getDate() + graceDays);

  if (currentDate > expiryWithGrace) {
    return { 
      isValid: false, 
      status: 'EXPIRED', 
      message: 'Your subscription has expired. Please contact Super Admin to renew.',
      expiryDate: hotel.expiryDate
    };
  }

  if (currentDate > expiryDate) {
    return { 
      isValid: true, 
      status: 'GRACE_PERIOD', 
      message: 'Subscription expired but within grace period',
      expiryDate: hotel.expiryDate
    };
  }

  return { 
    isValid: true, 
    status: 'ACTIVE', 
    message: 'Subscription is active',
    expiryDate: hotel.expiryDate
  };
};

module.exports = {
  checkSubscriptionStatus
};
