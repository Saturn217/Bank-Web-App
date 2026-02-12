const mongoose = require('mongoose');


const TransactionSchema = mongoose.Schema({

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'bankUser', required: true },
    type: { type: String, enum: ['deposit', 'withdrawal', 'transfer'], required: true },
    amount: { type: Number, required: true },
    senderAccount: { type: String, required: true },
    receiverAccount: { type: String, required: true}, 
    status: {type: String, enum: ["success", "failed"], default: "success"}  ,
    description: { type: String }


}, { timestamps: true });
// Indexing the createdAt field for efficient sorting and querying of transactions based on their creation time

const TransactionModel = mongoose.model('Transaction', TransactionSchema);  

module.exports = TransactionModel;