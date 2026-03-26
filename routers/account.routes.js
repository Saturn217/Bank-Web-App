
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const router = express.Router();
const { deposit, withdrawal, Transfer, verifyAccountNumber, setTransactionPin } = require('../controllers/account.controller');
const { protect } = require('../middleware/auth.middleware');
const validatePin = require('../middleware/validatePin');
import { apiLimiter, transactionLimiter, pinLimiter, authLimiter } from '../middleware/rateLimiter';




router.post("/deposit", protect, transactionLimiter, deposit)

router.post("/withdraw", protect, validatePin, transactionLimiter, pinLimiter, withdrawal)

router.post("/transfer", protect, validatePin,transactionLimiter, pinLimiter, Transfer)
router.get("/account-holder/",  verifyAccountNumber )
router.post('/set-pin', protect, setTransactionPin);






module.exports = router;