const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require("../models/transaction.model");


const adminOnly = (req, res, next) => {
  if (!req.user || req.user.roles !== 'admin') {
    return res.status(403).json({ 
      status: 'error',
      message: 'Admin access required' 
    });
  }
  next();
};

module.exports = adminOnly;