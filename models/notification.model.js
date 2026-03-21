const mongoose = require('mongoose');


const NotificationSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankUser',
        required: true,
        index: true
    },

    type: {
        type: String,
        enum: [
            'deposit',
            'withdrawal',
            'transfer_sent',
            'transfer_received',
            'savings_deposit',
            'savings_withdrawal',
            'savings_interest',
            'bill_payment',
            'pin_set',
            'pin_reset',
            'account_locked',
            'welcome_bonus'
        ],
        required: true
    },

    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        default: null
    },
    relatedTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },

}, { timestamps: true })


const NotificationModel = mongoose.model('Notification', NotificationSchema);

module.exports = NotificationModel;





