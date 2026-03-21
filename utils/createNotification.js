const TransactionModel = require('../models/transaction.model');
const BankUserModel = require('../models/bankUser.model');
const NotificationModel = require('../models/notification.model');


const createNotification = async ({
  userId,
  type,
  title,
  message,
  amount = null,
  transactionId = null
}) => {


  try {
    await NotificationModel.create({
      user: userId,
      type,
      title,
      message,
      amount,
      relatedTransaction: transactionId
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
    // Don't throw — notifications are non-critical
  }
};

module.exports = createNotification;