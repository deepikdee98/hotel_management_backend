/**
 * Billing Calculator Service
 * Calculates net amount based on PMS logic
 * netAmount = (planCharge - discount) + foodCharge
 */

const calculateNetAmount = (planCharge, foodCharge, discount) => {
  const pCharge = Number(planCharge) || 0;
  const fCharge = Number(foodCharge) || 0;
  const disc = Number(discount) || 0;

  // Validation: Discount applies ONLY to planCharge
  // Ensure discount does not exceed planCharge
  const effectiveDiscount = Math.min(disc, pCharge);
  
  const netAmount = (pCharge - effectiveDiscount) + fCharge;
  
  return Math.max(0, netAmount);
};

module.exports = {
  calculateNetAmount,
};
