const GST_PERCENT = 12;

const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

function calculateGSTBreakdown(baseAmount) {
  const normalizedBase = toNum(baseAmount);
  const gstAmount = (normalizedBase * GST_PERCENT) / 100;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  return {
    gstPercent: GST_PERCENT,
    baseAmount: normalizedBase,
    gstAmount,
    cgst,
    sgst,
    totalAmount: normalizedBase + gstAmount,
  };
}

module.exports = {
  GST_PERCENT,
  calculateGSTBreakdown,
};
