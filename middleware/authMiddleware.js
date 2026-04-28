const asyncHandler = require("express-async-handler")
const jwt = require("jsonwebtoken")
const User = require("../models/userModel")
const Hotel = require("../models/SuperAdmin/hotelModel")
const { constants } = require("../constants")

const resolveUserModules = async (user) => {
    if (user.role === "superadmin") {
        return Array.isArray(user.modules) ? user.modules : [];
    }

    if (!user.hotelId) {
        return Array.isArray(user.modules) ? user.modules : [];
    }

    const hotel = await Hotel.findById(user.hotelId).select("modules").lean();
    const hotelModules = Array.isArray(hotel?.modules) ? hotel.modules : [];

    if (user.role === "hoteladmin") {
        return hotelModules;
    }

    const assignedModules = Array.isArray(user.modules) ? user.modules : [];
    return assignedModules.filter((moduleName) => hotelModules.includes(moduleName));
}

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

            req.user.modules = await resolveUserModules(req.user)

            next()
        } catch (error) {
            res.status(constants.UNAUTHORIZED)
            throw new Error("User is not authorized")
        }
    } else {
        res.status(constants.UNAUTHORIZED)
        throw new Error("User is not authorized")
    }
})

module.exports = { protect } 