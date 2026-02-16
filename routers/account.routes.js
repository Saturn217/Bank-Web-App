
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const router = express.Router();
const { deposit, withdrawal, Transfer } = require('../controllers/account.controller');




router.post("/deposit", deposit)

router.post("/withdraw", withdrawal)

router.post("/transfer", Transfer)





module.exports = router;