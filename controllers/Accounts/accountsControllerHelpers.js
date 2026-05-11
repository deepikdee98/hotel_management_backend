const { requireTenant, getBusinessId, dateRangeFilter, toNum, invoiceStatus } = require("../../services/accountsService");

function tenantFilter(req, dateField, extra = {}) {
  const hotelId = requireTenant(req);
  const businessId = getBusinessId(req);
  return {
    hotelId,
    ...(businessId ? { businessId } : {}),
    ...dateRangeFilter(req.query, dateField),
    ...extra,
  };
}

function search(searchTerm, fields) {
  if (!searchTerm) return {};
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: String(searchTerm), $options: "i" },
    })),
  };
}

function mapInvoice(invoice) {
  return {
    ...invoice.toObject(),
    id: invoice.invoiceNumber,
    guestName: invoice.guestName || invoice.customerName || invoice.companyName || "",
    room: invoice.room || "",
    taxes: toNum(invoice.totalTax),
    total: toNum(invoice.grandTotal),
    paid: toNum(invoice.amountPaid),
    balance: toNum(invoice.balanceDue),
    status: invoiceStatus(invoice),
  };
}

module.exports = {
  tenantFilter,
  search,
  mapInvoice,
};
