
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const router = express.Router();
const { deposit, withdrawal, Transfer, getTransactions } = require('../controllers/account.controller');
const { protect } = require('../middleware/auth.middleware');




router.post("/deposit", protect, deposit)

router.post("/withdraw", protect,  withdrawal)

router.post("/transfer", protect, Transfer)






module.exports = router;