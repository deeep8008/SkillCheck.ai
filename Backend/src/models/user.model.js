const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true,
        select: false
    }
}, {
    toJSON: {
        transform(_doc, result) {
            delete result.password;
            return result;
        }
    }
});
module.exports = mongoose.model("User", userSchema);
