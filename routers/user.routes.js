const express = require('express');
const { createBankUser, login, getMe, getDashboard } = require('../controllers/bankUser.controller');
const {  protect } = require('../middleware/auth.middleware');
const router = express.Router();











router.post("/register", createBankUser)
router.post("/login", login)
router.get("/me", protect, getMe )
router.get("/dashboard", protect, getDashboard )




module.exports = router;