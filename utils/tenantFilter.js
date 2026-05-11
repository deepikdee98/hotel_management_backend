/**
 * Utility to generate a tenant-safe query
 * @param {Object} req - The Express request object
 * @param {Object} query - The initial query object
 * @returns {Object} - The merged query object with hotelId if applicable
 */
const getTenantFilter = (req, query = {}) => {
  // If user is superadmin, they can query without tenant restrictions (or pass it explicitly in query)
  if (req.user && req.user.role === "superadmin") {
    return query;
  }

  // Ensure hotelId is strictly applied for regular tenant users
  if (req.user && req.user.hotelId) {
    return { ...query, hotelId: req.user.hotelId };
  }

  // If no user context, return a query that will likely yield nothing or error out
  // depending on strictness. Here we default to returning the original query 
  // (assuming authMiddleware handles unauthorized access).
  // But safer is to force a failure if context is somehow lost.
  return { ...query, hotelId: null };
};

module.exports = { getTenantFilter };
