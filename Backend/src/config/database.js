const mongoose = require("mongoose");

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("Connected to Database");
}

module.exports = { connectDB };
