const mongoose = require('mongoose');

const BankUserSchema = mongoose.Schema({
    fullName: {type: String,  trim: true, required:true},
    email: {type: String, lowercase: true, trim: true, required:true, unique:true},
    accountNumber: { type: String, unique: true },
    balance: { type: Number, default: 100000 },  
    password: {type: String, required:true},
    roles: {type:String , enum:["admin", "user"], default:"user"}, 
    
}, { timestamps: true })


// BankUserSchema.index({email:1})
// BankUserSchema.index({accountNumber:1})

const BankUserModel = mongoose.model('bankUser', BankUserSchema);

module.exports = BankUserModel;