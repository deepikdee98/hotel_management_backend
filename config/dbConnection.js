const mongoose = require("mongoose");
const { env } = require("./env");
const logger = require("../utils/logger");
const mongoosePerformancePlugin = require("../utils/mongoosePerformancePlugin");

mongoose.set("strictQuery", true);
mongoose.plugin(mongoosePerformancePlugin);

const connectDb = async () => {
    try {
        let uri = env.mongoUri;
        if (!/retryWrites\s*=\s*(true|false)/i.test(uri)) {
            uri += uri.includes("?") ? "&retryWrites=false" : "?retryWrites=false";
        }
        const connect = await mongoose.connect(uri, {
            retryWrites: false,
            maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 100,
            minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
            serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
            socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
            maxIdleTimeMS: Number(process.env.MONGO_MAX_IDLE_TIME_MS) || 60000,
        });
        logger.info({
            host: connect.connection.host,
            name: connect.connection.name,
            maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 100,
        }, "Database connected");

    } catch (err) {
        logger.error({ error: err.message, stack: err.stack }, "Database connection failed");
        process.exit(1);
    }
}

module.exports = connectDb
