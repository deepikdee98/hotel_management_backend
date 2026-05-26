const asyncHandler = require("express-async-handler")
const jwt = require("jsonwebtoken")
const User = require("../models/userModel")
const Hotel = require("../models/SuperAdmin/hotelModel")
const { constants } = require("../constants")
const { checkSubscriptionStatus } = require("../utils/subscriptionHelper")
const { env } = require("../config/env")
const cache = require("../utils/cache")
const cacheKeys = require("../utils/cacheKeys")

const getCookieValue = (cookieHeader, name) => {
    if (!cookieHeader) return null;
    const match = String(cookieHeader)
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

const protect = asyncHandler(async (req, res, next) => {
    let token;
    const authHeader = req.headers.Authorization || req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer")) {
        token = authHeader.split(" ")[1];
    } else {
        token = getCookieValue(req.headers.cookie, "accessToken");
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, env.accessTokenSecret)
            const cacheKey = cacheKeys.authUser(decoded.user.id);
            let user = await cache.get(cacheKey);

            if (!user) {
                user = await User.findById(decoded.user.id)
                    .select("_id email username role hotelId modules isActive tokenVersion")
                    .lean();
                if (user) {
                    await cache.set(cacheKey, user, env.authCacheTtlSeconds);
                }
            }

            req.user = user
            if (!req.user) {
                res.status(constants.UNAUTHORIZED)

                throw new Error("User not found")
            }

            if (!req.user.isActive || decoded.user.tokenVersion !== req.user.tokenVersion) {
                return res.status(401).json({
                    message: "Session expired. Please login again."
                });
            }

            // Subscription and Active Status Check
            // Super admins are exempt from hotel subscription checks
            if (req.user.role !== 'superadmin' && req.user.hotelId) {
                const hotelKey = cacheKeys.hotel(req.user.hotelId);
                let hotel = await cache.get(hotelKey);
                if (!hotel) {
                    hotel = await Hotel.findById(req.user.hotelId)
                        .select("status isActive expiryDate modules")
                        .lean();
                    if (hotel) {
                        await cache.set(hotelKey, hotel, env.authCacheTtlSeconds);
                    }
                }
                const subscription = checkSubscriptionStatus(hotel);

                if (!subscription.isValid) {
                    res.status(403).json({
                        message: subscription.message,
                        code: subscription.status === 'INACTIVE' ? 'HOTEL_INACTIVE' : 'SUBSCRIPTION_EXPIRED',
                        expiryDate: subscription.expiryDate,
                        subscription
                    });
                    return;
                }
            }

            next()
        } catch (error) {

    if (error.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            message: "Your session has expired. Please login again."
        });
    }

    if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            message: "Invalid token."
        });
    }

    if (res.statusCode === 200) {
        res.status(constants.UNAUTHORIZED)
    }

    return res.json({
        success: false,
        message: error.message
    });
}
    } else {
        res.status(constants.UNAUTHORIZED)
        throw new Error("User is not authorized")
    }
})

module.exports = { protect } 
