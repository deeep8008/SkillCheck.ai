const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    username:{
        type:String,
        unique :[true,"username is already taken"],
        require:true
    },
    email:{
        type:String,
        unique:[true,"email is already taken"],
        require:true
    },
    password:{
        type:String,
        require:true
    }

})
module.exports = mongoose.model("User",userSchema);
