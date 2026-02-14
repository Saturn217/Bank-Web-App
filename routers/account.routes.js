
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const router = express.Router();
const { deposit } = require('../controllers/account.controller');




router.post("/deposit", deposit)

module.exports = router;