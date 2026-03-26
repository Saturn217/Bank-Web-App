const express = require('express');
const { createBankUser, login, getMe, getDashboard, requestOTP, forgotPassword, changePassword } = require('../controllers/bankUser.controller');
const {  protect } = require('../middleware/auth.middleware');
const router = express.Router();
import { apiLimiter, transactionLimiter, pinLimiter, authLimiter } from '../middleware/rateLimiter';













router.post("/register", authLimiter, createBankUser)
router.post("/login", authLimiter, login)
router.get("/me", protect, getMe )

router.get("/dashboard", protect, getDashboard )

router.post("/request-otp",  requestOTP)

router.post("/forgot-password", forgotPassword)
router.post('/change-password', protect, changePassword );




module.exports = router;