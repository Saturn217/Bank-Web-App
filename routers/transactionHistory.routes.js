
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const { getTransactions } = require('../controllers/transaction.controller');
const router = express.Router();




router.get("/transactions",  getTransactions)

module.exports = router;
