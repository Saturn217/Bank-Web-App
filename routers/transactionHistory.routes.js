
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const { getUserTransactions } = require('../controllers/transaction.controller');
const {  protect } = require('../middleware/auth.middleware');
const router = express.Router();




router.get("/transactions", protect,  getUserTransactions)

module.exports = router;
