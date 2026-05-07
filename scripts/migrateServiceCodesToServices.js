const Service = require("../models/Admin/serviceModel");
const ServiceCode = require("../models/Admin/ServiceCodeModel");

module.exports = async function migrateServiceCodesToServices() {
  const serviceCodes = await ServiceCode.find();
  let created = 0;
  let skipped = 0;

  for (const code of serviceCodes) {
    const existing = await Service.findOne({ code: code.code, hotelId: code.hotelId });
    if (existing) {
      skipped += 1;
      continue;
    }

    await Service.create({
      hotelId: code.hotelId,
      name: code.serviceName,
      code: code.code,
      category: code.category || "Other",
      defaultPrice: Number(code.defaultRate || 0),
      chargeType: "PER_STAY",
      gstApplicable: Number(code.gst || 0) > 0,
      gstPercentage: Number(code.gst || 0),
      gstType: "EXCLUSIVE",
      status: code.status || "active",
    });

    created += 1;
  }

  return {
    created,
    updated: 0,
    skipped,
    total: serviceCodes.length,
    message: `Services migration complete. Created: ${created}. Skipped: ${skipped}. Total service codes: ${serviceCodes.length}.`,
  };
};
