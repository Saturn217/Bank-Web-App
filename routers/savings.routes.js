
const express = require("express")
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const { withdrawFromSavings, depositToSavings, getSavingsOverview } = require("../controllers/savings.controller");
const { protect } = require("../middleware/auth.middleware");
const { triggerInterest } = require("../jobs/savingsInterest");
const router = express.Router();



router.post("/savings/deposit", protect, depositToSavings)
router.post("/savings/withdraw", protect,  withdrawFromSavings)
router.get("/savings/overview", protect, getSavingsOverview)
router.get("/trigger-interest",  triggerInterest  )


module.exports= router