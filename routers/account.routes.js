
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const router = express.Router();
const { deposit, withdrawal, Transfer, verifyAccountNumber, setTransactionPin } = require('../controllers/account.controller');
const { protect } = require('../middleware/auth.middleware');
const validatePin = require('../middleware/validatePin');




router.post("/deposit", protect, deposit)

router.post("/withdraw", protect, validatePin,  withdrawal)

router.post("/transfer", protect, validatePin, Transfer)
router.get("/account-holder/",  verifyAccountNumber )
router.post('/set-pin', protect, setTransactionPin);






module.exports = router;