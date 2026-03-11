const express = require('express');
const { createBankUser, login, getMe, getDashboard, requestOTP, forgotPassword } = require('../controllers/bankUser.controller');
const {  protect } = require('../middleware/auth.middleware');
const router = express.Router();











router.post("/register", createBankUser)
router.post("/login", login)
router.get("/me", protect, getMe )
router.get("/dashboard", protect, getDashboard )

router.post("/request-reset-otp",  requestOTP)

router.post("/forgot-password", forgotPassword)




module.exports = router;