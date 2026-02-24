
const express = require("express")
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const { withdrawFromSavings, depositToSavings } = require("../controllers/savings.controller");
const { protect } = require("../middleware/auth.middleware");
const router = express.Router();




router.post("/savings/deposit", protect, depositToSavings)
router.post("/savings/withdraw", protect,  withdrawFromSavings)


module.exports= router