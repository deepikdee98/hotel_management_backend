const Hotel = require("../models/SuperAdmin/hotelModel");
const { deleteS3Object } = require("../services/s3UploadService");

const keyFromUrl = (url) => {
  if (!url) return "";

  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
};

const resolveHotelName = async (hotelId, hotelName) => {
  if (hotelName) return hotelName;

  const hotel = await Hotel.findById(hotelId).select("name").lean();
  return hotel?.name || "";
};

const deleteReplacedS3Objects = async ({ hotelId, hotelName, replacements = [] }) => {
  const keys = Array.from(new Set(
    replacements
      .map(({ oldKey, oldUrl, newKey }) => {
        const resolvedOldKey = oldKey || keyFromUrl(oldUrl);
        return resolvedOldKey && resolvedOldKey !== newKey ? resolvedOldKey : "";
      })
      .filter(Boolean)
  ));

  if (!keys.length) return [];

  const resolvedHotelName = await resolveHotelName(hotelId, hotelName);
  const warnings = [];

  for (const key of keys) {
    try {
      await deleteS3Object({ hotelId, hotelName: resolvedHotelName, key });
    } catch (error) {
      warnings.push({ key, message: error.message });
    }
  }

  return warnings;
};

module.exports = {
  deleteReplacedS3Objects,
};
