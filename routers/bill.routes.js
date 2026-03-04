const express = require("express")
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const { protect } = require("../middleware/auth.middleware");
const { payBill } = require("../controllers/bill.controller");
const router = express.Router();




router.post("/pay", protect , payBill)


module.exports = router