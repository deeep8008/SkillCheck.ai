const mongoose = require("mongoose");
const blacklistTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required to add in the blacklist"],
        index: true
    }
},
    { timestamps: true })

// auto-delete blacklisted tokens after 24 hours (matches JWT expiry)
blacklistTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Blacklist", blacklistTokenSchema);
