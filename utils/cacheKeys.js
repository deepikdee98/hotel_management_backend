module.exports = {
  superAdminDashboard: "dashboard:super-admin:stats",
  authUser: (userId) => `auth:user:${userId}`,
  hotel: (hotelId) => `hotel:${hotelId}`,
  notifications: (query = "") => `notifications:super-admin:${query}`,
};
