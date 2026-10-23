const mongoose = require("mongoose");
const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        require: [true, "token is required to add in the blacklist"]
    }
},
    { timestamps: true })

module.exports = mongoose.model("Blacklist", blacklistTokenSchema);