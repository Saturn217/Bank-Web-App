const express = require('express');
const { createBankUser, login } = require('../controllers/bankUser.controller');
const router = express.Router();











router.post("/register", createBankUser)
router.post("/login", login)

module.exports = router;