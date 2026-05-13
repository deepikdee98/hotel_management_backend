/**
 * Billing Calculator Service
 * Calculates net amount based on PMS logic
 * 
 * Logic:
 * 1. foodTotal = foodCharge * nights
 * 2. planTotal = planCharge * nights
 * 3. discountAmount = (planTotal * discountPercent) / 100
 * 4. afterDiscount = planTotal - discountAmount
 * 5. gstAmount = (afterDiscount * gstPercent) / 100
 * 6. finalPlanAmount = afterDiscount + gstAmount
 * 7. netAmount = finalPlanAmount + foodTotal
 */

const calculateBillingBreakdown = ({
  foodCharge = 0,
  planCharge = 0,
  nights = 1,
  discountPercent = 0,
  gstPercent = 0,
}) => {
  const fCharge = Number(foodCharge) || 0;
  const pCharge = Number(planCharge) || 0;
  const numNights = Math.max(1, Number(nights) || 1);
  const discPct = Number(discountPercent) || 0;
  const gstPct = Number(gstPercent) || 0;

  const foodTotal = fCharge * numNights;
  const planTotal = pCharge * numNights;
  const discountAmount = (planTotal * discPct) / 100;
  const afterDiscount = planTotal - discountAmount;
  const gstAmount = (afterDiscount * gstPct) / 100;
  const finalPlanAmount = afterDiscount + gstAmount;
  const netAmount = finalPlanAmount + foodTotal;

  return {
    foodTotal,
    planTotal,
    discountAmount,
    afterDiscount,
    gstAmount,
    finalPlanAmount,
    netAmount,
  };
};

module.exports = {
  calculateBillingBreakdown,
};
