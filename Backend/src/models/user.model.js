const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    username: {
        type: String,
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
// Preserve legacy records without a username while enforcing uniqueness for valid ones.
userSchema.index({ username: 1 }, {
    unique: true,
    partialFilterExpression: { username: { $type: "string" } }
});
module.exports = mongoose.model("User", userSchema);
