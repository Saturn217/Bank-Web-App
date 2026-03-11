const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const { getAdminOverview } = require('../controllers/admin.controller');
const router = express.Router();
const adminOnly = require('../middleware/admin.middleware');
const { protect } = require('../middleware/auth.middleware');


router.get('/overview', protect, adminOnly , getAdminOverview);



module.exports = router
