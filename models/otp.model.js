const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
    email: {type:String, required:true},
    otp:{type:String, required:true},
    createdAt:{type:Date, expires:300, default:Date.now} // 5 mins
})


const OTPModel = mongoose.model("otp", OTPSchema)

module.exports = OTPModel

