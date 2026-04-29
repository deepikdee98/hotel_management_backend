const asyncHandler = require("express-async-handler")
const jwt = require("jsonwebtoken")
const User = require("../models/userModel")
const Hotel = require("../models/SuperAdmin/hotelModel")
const { constants } = require("../constants")
const { checkSubscriptionStatus } = require("../utils/subscriptionHelper")

const protect = asyncHandler(async (req, res, next) => {
    let token;
    const authHeader = req.headers.Authorization || req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
        token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            req.user = await User.findById(decoded.user.id).select("-password")
            if (!req.user) {
                res.status(constants.UNAUTHORIZED)

                throw new Error("User not found")
            }

            if (decoded.user.tokenVersion !== req.user.tokenVersion) {
                return res.status(401).json({
                    message: "Session expired. Please login again."
                });
            }

            // Subscription and Active Status Check
            // Super admins are exempt from hotel subscription checks
            if (req.user.role !== 'superadmin' && req.user.hotelId) {
                const hotel = await Hotel.findById(req.user.hotelId);
                const subscription = checkSubscriptionStatus(hotel);

                if (!subscription.isValid) {
                    res.status(403).json({
                        message: subscription.message,
                        code: subscription.status === 'INACTIVE' ? 'HOTEL_INACTIVE' : 'SUBSCRIPTION_EXPIRED',
                        expiryDate: subscription.expiryDate
                    });
                    return;
                }
            }

            next()
        } catch (error) {
            if (res.statusCode === 200) {
                res.status(constants.UNAUTHORIZED)
            }
            throw error
        }
    } else {
        res.status(constants.UNAUTHORIZED)
        throw new Error("User is not authorized")
    }
})

module.exports = { protect } 