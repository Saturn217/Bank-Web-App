const mongoose = require('mongoose');

const BankUserSchema = mongoose.Schema({
    fullName: { type: String, trim: true, required: true },
    email: { type: String, lowercase: true, trim: true, required: true, unique: true },
    accountNumber: { type: String, unique: true },
    balance: { type: Number, default: 100000 },
    savingsBalance: { type: Number, default: 0, min: [0, "Savings balance cannot go negative"] },
    lastMonthlyInterestAt: {
        type: Date,
        default: null,
    },
    totalInterestEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    password: { type: String, required: true },
    roles: { type: String, enum: ["admin", "user"], default: "user" },

}, { timestamps: true })


const BankUserModel = mongoose.model('bankUser', BankUserSchema);

module.exports = BankUserModel;