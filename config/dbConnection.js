const mongoose = require("mongoose");

const connectDb = async() =>{
    try{
        const uri = process.env.CONNECTION_STRING || "mongodb://127.0.0.1:27017/hotel_management";
        const connect = await mongoose.connect(uri)
        console.log("DataBase Connected",connect.connection.host,connect.connection.name);
        

    }catch(err){
        console.log(err);
        process.exit(1)
        
    }
}

module.exports = connectDb