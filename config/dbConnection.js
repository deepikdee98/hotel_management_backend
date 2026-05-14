const mongoose = require("mongoose");

const connectDb = async () => {
    try {
        let uri = process.env.CONNECTION_STRING || "mongodb://127.0.0.1:27017/hotel_management";
        if (!/retryWrites\s*=\s*(true|false)/i.test(uri)) {
            uri += uri.includes("?") ? "&retryWrites=false" : "?retryWrites=false";
        }
        const connect = await mongoose.connect(uri, {
            retryWrites: false,
        });
        console.log("DataBase Connected", connect.connection.host, connect.connection.name);

    } catch (err) {
        console.log(err);
        process.exit(1);
    }
}

module.exports = connectDb