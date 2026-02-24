const mongoose = require('mongoose');


const TransactionSchema = mongoose.Schema({

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'bankUser', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'savings_deposit', 'savings_withdrawal', 'savings_interst', 'bill_payment'], required: true },
    amount: { type: Number, required: true },
    senderAccount: { type: String, required: true },
    receiverAccount: { type: String, required: true },
    savingsBalanceAfter: { type: Number, default: null },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    description: { type: String, required: true },
    note: { type: String },
    billType: {
        type: String,
        enum: ['airtime', 'internet', 'electricity', 'water'],
        default: null
    },
    billProvider: { type: String, default: null },     // e.g. "IBEDC", "MTN", "DStv"
    billReference: { type: String, default: null }


}, { timestamps: true });
// Indexing the createdAt field for efficient sorting and querying of transactions based on their creation time

const TransactionModel = mongoose.model('Transaction', TransactionSchema);

module.exports = TransactionModel;