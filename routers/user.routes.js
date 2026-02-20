const express = require('express');
const { createBankUser, login, getMe } = require('../controllers/bankUser.controller');
const {  protect } = require('../middleware/auth.middleware');
const router = express.Router();











router.post("/register", createBankUser)
router.post("/login", login)
router.get("/me", protect, getMe )


module.exports = router;